#!/usr/bin/env node
/**
 * scripts/audit-baseline.cjs
 *
 * SSVM ERP — System Architecture, Multi-Tenancy & Route Authorization Baseline Generator
 *
 * Usage:
 *   node scripts/audit-baseline.cjs           # Regenerates docs/AUDIT/BASELINE.md
 *   node scripts/audit-baseline.cjs --write   # Explicitly write docs/AUDIT/BASELINE.md
 *   node scripts/audit-baseline.cjs --check   # Fails with exit code 1 if drift or invalid model counts
 */

const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

let ts;
try {
  ts = require("typescript");
} catch {
  ts = require(path.resolve(__dirname, "../ssvm-backend/node_modules/typescript"));
}

const repoRoot = path.resolve(__dirname, "..");
const backendRoot = path.join(repoRoot, "ssvm-backend");
const sourceRoot = path.join(backendRoot, "src");
const appFile = path.join(sourceRoot, "app.ts");
const tenantClassificationFile = path.join(repoRoot, "docs", "DATABASE", "TENANT_CLASSIFICATION.json");
const baselineOutputFile = path.join(repoRoot, "docs", "AUDIT", "BASELINE.md");

const isCheckMode = process.argv.includes("--check");

// 1. Extract Current Commit SHA
let commitSha = process.env.GITHUB_SHA || "";
try {
  commitSha = execSync("git rev-parse HEAD", { cwd: repoRoot, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
} catch {
  if (!commitSha) commitSha = "UNKNOWN_COMMIT";
}

// 2. Load & Validate Tenant Classification Baseline (Prisma models)
if (!fs.existsSync(tenantClassificationFile)) {
  console.error(`Error: Tenant classification file not found at ${tenantClassificationFile}`);
  process.exit(1);
}

const classificationData = JSON.parse(fs.readFileSync(tenantClassificationFile, "utf8"));
const modelCount = classificationData.modelCount || Object.keys(classificationData.models || {}).length;
const directCount = classificationData.directCount || 0;
const indirectCount = classificationData.indirectCount || 0;
const globalCount = classificationData.globalCount || 0;

const EXPECTED_MODELS = 222;
const EXPECTED_DIRECT = 141;
const EXPECTED_INDIRECT = 50;
const EXPECTED_GLOBAL = 31;

if (modelCount !== EXPECTED_MODELS || directCount !== EXPECTED_DIRECT || indirectCount !== EXPECTED_INDIRECT || globalCount !== EXPECTED_GLOBAL) {
  console.error(`Error: Tenant classification count mismatch!`);
  console.error(`  Expected: Total=${EXPECTED_MODELS}, Direct=${EXPECTED_DIRECT}, Indirect=${EXPECTED_INDIRECT}, Global=${EXPECTED_GLOBAL}`);
  console.error(`  Found:    Total=${modelCount}, Direct=${directCount}, Indirect=${indirectCount}, Global=${globalCount}`);
  if (isCheckMode) process.exit(1);
}

// 3. Parse Route Mounts from app.ts
const appText = fs.readFileSync(appFile, "utf8");
const appSource = ts.createSourceFile(appFile, appText, ts.ScriptTarget.Latest, true);

const imports = new Map();
function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, child => walk(child, visit));
}

walk(appSource, node => {
  // VariableDeclaration: const routeVar = (await import("./routes/...")).default;
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
    const text = node.initializer.getText(appSource);
    const m = text.match(/import\(["'](\.\/routes\/[^"']+)["']\)/);
    if (m) {
      let resolvedPath = path.resolve(sourceRoot, `${m[1]}.ts`);
      if (!fs.existsSync(resolvedPath)) {
        const indexPath = path.resolve(sourceRoot, m[1], "index.ts");
        if (fs.existsSync(indexPath)) resolvedPath = indexPath;
      }
      imports.set(node.name.text, resolvedPath);
    }
  }
  // Static import: import routeVar from "./routes/..."
  if (ts.isImportDeclaration(node) && node.importClause?.name && ts.isStringLiteral(node.moduleSpecifier)) {
    let resolvedPath = path.resolve(sourceRoot, `${node.moduleSpecifier.text}.ts`);
    if (!fs.existsSync(resolvedPath)) {
      const indexPath = path.resolve(sourceRoot, node.moduleSpecifier.text, "index.ts");
      if (fs.existsSync(indexPath)) resolvedPath = indexPath;
    }
    imports.set(node.importClause.name.text, resolvedPath);
  }
});

function literal(node) {
  if (!node) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

const mounts = [];
walk(appSource, node => {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
  if (node.expression.expression.getText(appSource) !== "app" || node.expression.name.text !== "use") return;
  const prefix = literal(node.arguments[0]);
  if (prefix === null) return;
  const identifier = [...node.arguments.slice(1)].reverse().find(ts.isIdentifier);
  if (identifier && imports.has(identifier.text)) {
    const mountMiddleware = node.arguments.slice(1, -1).map(arg => arg.getText(appSource).trim()).filter(Boolean);
    mounts.push({ prefix, file: imports.get(identifier.text), mountMiddleware });
  }
});

// App-level direct endpoints
const appDirectRoutes = [];
const methodNames = new Set(["get", "post", "put", "patch", "delete", "options", "head", "all"]);
walk(appSource, node => {
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
  if (node.expression.expression.getText(appSource) !== "app") return;
  const method = node.expression.name.text.toLowerCase();
  if (!methodNames.has(method)) return;
  const routePath = literal(node.arguments[0]);
  if (!routePath) return;
  const guards = node.arguments.slice(1, -1).map(a => a.getText(appSource).trim()).filter(Boolean);
  appDirectRoutes.push({
    method: method.toUpperCase(),
    endpoint: routePath,
    sourceFile: "src/app.ts",
    guards,
    tier: routePath.startsWith("/health") || routePath === "/metrics" ? "Tier 5 (Internal Diagnostics)" : "Tier 4 (Public Anonymous)"
  });
});

// 4. Collect & Parse All Router Files
const routeFiles = [];
function collectFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full);
    else if (entry.isFile() && entry.name.endsWith(".ts")) routeFiles.push(full);
  }
}
collectFiles(path.join(sourceRoot, "routes"));

// Handle nested sub-routers (e.g. routes/v2/index.ts mounting ledger)
for (const file of routeFiles) {
  const fileText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, fileText, ts.ScriptTarget.Latest, true);
  const subImports = new Map();
  walk(source, node => {
    if (ts.isImportDeclaration(node) && node.importClause?.name && ts.isStringLiteral(node.moduleSpecifier)) {
      const relPath = node.moduleSpecifier.text;
      const targetPath = path.resolve(path.dirname(file), `${relPath}.ts`);
      subImports.set(node.importClause.name.text, targetPath);
    }
  });

  const parentMounts = mounts.filter(m => m.file === file);
  if (parentMounts.length > 0) {
    walk(source, node => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
      if (node.expression.name.text !== "use") return;
      const subPrefix = literal(node.arguments[0]);
      if (!subPrefix) return;
      const id = node.arguments.find(ts.isIdentifier);
      if (id && subImports.has(id.text)) {
        const subFile = subImports.get(id.text);
        for (const pm of parentMounts) {
          const combinedPrefix = `${pm.prefix.replace(/\/$/, "")}/${subPrefix.replace(/^\//, "")}`;
          mounts.push({ prefix: combinedPrefix, file: subFile, mountMiddleware: [] });
        }
      }
    });
  }
}

// 5. Extract Individual Routes and Attached Guards
const extractedRoutes = [];

function classifyRouteTier(endpoint, guards) {
  const guardStr = guards.join(" ");
  if (endpoint.startsWith("/health") || endpoint.startsWith("/api/health") || endpoint.startsWith("/api/v1/health") || endpoint === "/metrics") {
    return "Tier 5 (Internal Diagnostics)";
  }
  if (endpoint.includes("/webhooks") || endpoint.includes("/biometric")) {
    return "Tier 2 (Machine / Webhook Auth)";
  }
  if (guardStr.includes("authenticate") || guardStr.includes("requireRole") || guardStr.includes("requireModule") || guardStr.includes("requireSchoolAccess")) {
    return "Tier 1 (Session Authenticated)";
  }
  if (endpoint.includes("/2fa") || endpoint.includes("/reset-password") || endpoint.includes("/verify-email") || endpoint.includes("/refresh")) {
    return "Tier 3 (Challenge / Token Lifecycle)";
  }
  if (guardStr.includes("verifyTurnstile") || endpoint.includes("/public") || endpoint.includes("/cms") || endpoint.includes("/alumni") || endpoint.includes("/admissions")) {
    return "Tier 4 (Public Anonymous Ingestion)";
  }
  return "Tier 4 (Public / General)";
}

for (const file of routeFiles) {
  const fileText = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, fileText, ts.ScriptTarget.Latest, true);

  const routerNames = new Set(["router"]);
  walk(source, node => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer || !ts.isCallExpression(node.initializer)) return;
    const initText = node.initializer.expression.getText(source);
    if (initText === "Router" || initText.endsWith(".Router") || initText === "express.Router") {
      routerNames.add(node.name.text);
    }
  });

  const fileRouterMiddleware = [];
  walk(source, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const exprText = node.expression.expression.getText(source);
    if (routerNames.has(exprText) && node.expression.name.text === "use") {
      // Check if it's route mount vs middleware
      if (node.arguments.length === 1 && !literal(node.arguments[0])) {
        fileRouterMiddleware.push(node.arguments[0].getText(source).trim());
      }
    }
  });

  walk(source, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const exprText = node.expression.expression.getText(source);
    const method = node.expression.name.text.toLowerCase();
    if (!routerNames.has(exprText) || !methodNames.has(method)) return;

    const routePath = literal(node.arguments[0]) || "(dynamic)";
    const routeGuards = [];

    // Filter out handler functions (arrow functions, function expressions)
    for (let i = 1; i < node.arguments.length; i++) {
      const arg = node.arguments[i];
      if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) continue;
      // If it is the last argument and an identifier matching common controller names, skip handler
      if (i === node.arguments.length - 1 && ts.isIdentifier(arg) && !["authenticate", "authLimiter", "strictLimiter"].includes(arg.text)) {
        continue;
      }
      routeGuards.push(arg.getText(source).replace(/\s+/g, " ").trim());
    }

    const fileMounts = mounts.filter(m => m.file === file);
    const targetMounts = fileMounts.length > 0 ? fileMounts : [{ prefix: "/unmounted", mountMiddleware: [] }];

    for (const mount of targetMounts) {
      let endpoint = routePath;
      if (routePath === "/" || routePath === "") {
        endpoint = mount.prefix;
      } else {
        endpoint = `${mount.prefix.replace(/\/$/, "")}/${routePath.replace(/^\//, "")}`;
      }

      const combinedGuards = [...mount.mountMiddleware, ...fileRouterMiddleware, ...routeGuards];
      const tier = classifyRouteTier(endpoint, combinedGuards);

      extractedRoutes.push({
        method: method.toUpperCase(),
        endpoint,
        sourceFile: path.relative(repoRoot, file).replace(/\\/g, "/"),
        guards: combinedGuards,
        tier
      });
    }
  });
}

const allRoutes = [...appDirectRoutes, ...extractedRoutes];

// Deterministic sort: endpoint -> method -> sourceFile
allRoutes.sort((a, b) => a.endpoint.localeCompare(b.endpoint) || a.method.localeCompare(b.method) || a.sourceFile.localeCompare(b.sourceFile));

// Deduplicate identical method + endpoint declarations
const uniqueRoutes = [];
const seenKey = new Set();
for (const r of allRoutes) {
  const key = `${r.method} ${r.endpoint} ${r.sourceFile}`;
  if (!seenKey.has(key)) {
    seenKey.add(key);
    uniqueRoutes.push(r);
  }
}

// 6. Generate Markdown Content
const now = new Date().toISOString();
let md = `# SSVM ERP — System Architecture & Security Baseline\n\n`;
md += `**Canonical Document:** \`docs/AUDIT/BASELINE.md\`  \n`;
md += `**Generated By:** \`scripts/audit-baseline.cjs\`  \n`;
md += `**Generated At:** \`${now}\`  \n`;
md += `**Baseline Commit SHA:** \`${commitSha}\`  \n\n`;

md += `## 1. Executive Summary\n\n`;
md += `This document serves as the authoritative, machine-verified architecture and security baseline for SSVM ERP.\n`;
md += `It captures the complete Prisma schema multi-tenancy classification and the entire HTTP route authorization matrix regenerated directly from source code.\n\n`;

md += `### System Metric Overview\n\n`;
md += `| Dimension | Baseline Count | Target / Enforcement Invariant |\n`;
md += `|---|:---:|---|\n`;
md += `| **Total Prisma Models** | **${modelCount}** | Exactly 222 classified database models |\n`;
md += `| — Direct Tenant Models (\`schoolId\`) | **${directCount}** | Fail-closed tenant RLS isolation with direct \`schoolId\` |\n`;
md += `| — Indirect Tenant Models | **${indirectCount}** | Inherited tenant RLS via parent foreign keys |\n`;
md += `| — Global System Models | **${globalCount}** | Multi-tenant SaaS platform & super-admin models |\n`;
md += `| **Total Route Declarations** | **${uniqueRoutes.length}** | Extracted from \`app.ts\` mounts and router definitions |\n`;
md += `| — Tier 1: Session Authenticated | **${uniqueRoutes.filter(r => r.tier.startsWith("Tier 1")).length}** | Requires active session token + role / module guards |\n`;
md += `| — Tier 2: Machine Auth / Webhook | **${uniqueRoutes.filter(r => r.tier.startsWith("Tier 2")).length}** | Dedicated HMAC signatures or machine API tokens |\n`;
md += `| — Tier 3: Token / Challenge Lifecycle | **${uniqueRoutes.filter(r => r.tier.startsWith("Tier 3")).length}** | 2FA, OTP verification, password resets, token refresh |\n`;
md += `| — Tier 4: Public Anonymous Ingestion | **${uniqueRoutes.filter(r => r.tier.startsWith("Tier 4")).length}** | Public admissions, inquiries, Turnstile protected |\n`;
md += `| — Tier 5: Internal Diagnostics | **${uniqueRoutes.filter(r => r.tier.startsWith("Tier 5")).length}** | Health checks, Prometheus metrics |\n\n`;

md += `---\n\n`;

md += `## 2. Prisma Datamodel & Multi-Tenancy Classification\n\n`;
md += `All 222 Prisma database models are partitioned under Row-Level Security invariants according to \`docs/DATABASE/TENANT_CLASSIFICATION.json\`:\n\n`;

md += `| Category | Count | Tenant Key / Relation Invariant | RLS Enforcement Mechanism |\n`;
md += `|---|:---:|---|---|\n`;
md += `| **DIRECT** | ${directCount} | Direct \`schoolId\` foreign key on entity table | PostgreSQL RLS: \`schoolId = current_setting('app.current_school_id')\` |\n`;
md += `| **INDIRECT** | ${indirectCount} | Joined through parent tenant-bound entity | PostgreSQL RLS via \`EXISTS\` join to direct tenant table |\n`;
md += `| **GLOBAL** | ${globalCount} | Platform-level (Schools, Super Admins, System Logs) | Restricted to \`SUPER_ADMIN\` / unprivileged bypass blocked |\n\n`;

md += `### Model Inventory Details\n\n`;
md += `| Model | Table Name | Classification | Direct \`schoolId\` | Tenancy Invariant Detail |\n`;
md += `|---|---|:---:|:---:|---|\n`;

const modelsList = Array.isArray(classificationData.models)
  ? classificationData.models
  : Object.values(classificationData.models || {});
modelsList.sort((a, b) => (a.model || "").localeCompare(b.model || ""));
for (const m of modelsList) {
  const mName = m.model || "UNKNOWN";
  const tblName = m.table || mName;
  const cType = (m.classification || "UNKNOWN").toUpperCase();
  const hasDirect = m.schoolIdField ? "Yes" : "No";
  const pathDesc = Array.isArray(m.path) && m.path.length > 0
    ? `Via ${m.path.map(p => typeof p === 'object' ? `${p.relation || ''} (${p.relatedModel || ''})` : p).join(" -> ")}`
    : (cType === "DIRECT" ? "Direct school ownership" : cType === "GLOBAL" ? "Global SaaS platform model" : "Indirect tenant relationship");
  md += `| \`${mName}\` | \`${tblName}\` | **${cType}** | ${hasDirect} | ${pathDesc} |\n`;
}

md += `\n---\n\n`;

md += `## 3. Route Authorization Matrix (Regenerated from Source)\n\n`;
md += `Every route listed below is mechanically extracted from Express mount definitions in \`src/app.ts\` and handlers in \`src/routes/**/*.ts\`:\n\n`;

md += `| Method | Endpoint | Source File | Attached Guards & Middleware | Security Tier |\n`;
md += `|:---:|---|---|---|:---:|\n`;

for (const r of uniqueRoutes) {
  const guardsText = r.guards.length > 0 ? `\`${r.guards.join(", ")}\`` : "*(none)*";
  md += `| **${r.method}** | \`${r.endpoint}\` | \`${r.sourceFile}\` | ${guardsText} | ${r.tier} |\n`;
}

md += `\n---\n\n`;

md += `## 4. Machine Verification Commands\n\n`;
md += `To verify and maintain this baseline across development stages:\n\n`;
md += `\`\`\`bash\n`;
md += `# 1. Regenerate baseline document\n`;
md += `node scripts/audit-baseline.cjs\n\n`;
md += `# 2. Check for baseline drift\n`;
md += `node scripts/audit-baseline.cjs --check\n\n`;
md += `# 3. Check tenant model classification consistency\n`;
md += `npm --prefix ssvm-backend run db:tenant-classification:check\n\n`;
md += `# 4. Run full PostgreSQL RLS suite\n`;
md += `npm --prefix ssvm-backend run test:rls\n`;
md += `\`\`\`\n`;

// 7. Write or Check Mode Execution
if (isCheckMode) {
  if (!fs.existsSync(baselineOutputFile)) {
    console.error(`Error: Baseline file does not exist at ${baselineOutputFile}`);
    process.exit(1);
  }
  const existingContent = fs.readFileSync(baselineOutputFile, "utf8");
  // Normalize date line before comparing
  const normalize = str => str.replace(/\*\*Generated At:\*\* `[^`]+`/, "").replace(/\*\*Baseline Commit SHA:\*\* `[^`]+`/, "");
  if (normalize(existingContent) !== normalize(md)) {
    console.error(`Error: docs/AUDIT/BASELINE.md is out of date! Run 'node scripts/audit-baseline.cjs' to update.`);
    process.exit(1);
  }
  console.log(`✅ Baseline verified: ${uniqueRoutes.length} routes, ${modelCount} models (${directCount} direct, ${indirectCount} indirect, ${globalCount} global).`);
} else {
  fs.writeFileSync(baselineOutputFile, md, "utf8");
  console.log(`✅ Generated docs/AUDIT/BASELINE.md successfully!`);
  console.log(`   - Baseline Commit SHA: ${commitSha}`);
  console.log(`   - Prisma Models: ${modelCount} (Direct: ${directCount}, Indirect: ${indirectCount}, Global: ${globalCount})`);
  console.log(`   - Unique Routes Extracted: ${uniqueRoutes.length}`);
}
