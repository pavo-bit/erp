#!/usr/bin/env node
/**
 * scripts/generate-kpi-catalogue.cjs
 *
 * Generates and validates docs/KPI/KPI_CATALOGUE.md from ssvm-backend/src/kpi/registry.ts
 *
 * Usage:
 *   node scripts/generate-kpi-catalogue.cjs          # Generates docs/KPI/KPI_CATALOGUE.md
 *   node scripts/generate-kpi-catalogue.cjs --check  # Verifies catalogue is up-to-date (fails with code 1 on drift)
 */

const fs = require("node:fs");
const path = require("node:path");

let ts;
try {
  ts = require("typescript");
} catch {
  ts = require(path.resolve(__dirname, "../ssvm-backend/node_modules/typescript"));
}

const repoRoot = path.resolve(__dirname, "..");
const registryFile = path.join(repoRoot, "ssvm-backend", "src", "kpi", "registry.ts");
const catalogueFile = path.join(repoRoot, "docs", "KPI", "KPI_CATALOGUE.md");

const isCheckMode = process.argv.includes("--check");

if (!fs.existsSync(registryFile)) {
  console.error(`Error: Registry file not found at ${registryFile}`);
  process.exit(1);
}

const sourceText = fs.readFileSync(registryFile, "utf8");
const sourceFile = ts.createSourceFile(registryFile, sourceText, ts.ScriptTarget.Latest, true);

const kpis = [];

function parseKpiObject(objNode) {
  const kpi = {};
  for (const prop of objNode.properties) {
    if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
      const key = prop.name.text;
      if (ts.isStringLiteral(prop.initializer)) {
        kpi[key] = prop.initializer.text;
      }
    }
  }
  return kpi;
}

function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === "KPI_REGISTRY") {
    if (node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      for (const element of node.initializer.elements) {
        if (ts.isObjectLiteralExpression(element)) {
          const kpi = parseKpiObject(element);
          if (kpi.id) {
            kpis.push(kpi);
          }
        }
      }
    }
  }
  ts.forEachChild(node, visit);
}

visit(sourceFile);

if (kpis.length === 0) {
  console.error("Error: Failed to parse any KPIs from registry.ts");
  process.exit(1);
}

// Generate Markdown Catalogue
const lines = [
  "# SSVM ERP — Key Performance Indicators (KPI) Catalogue",
  "",
  `> **Generated Document:** Auto-generated from \`ssvm-backend/src/kpi/registry.ts\` by \`scripts/generate-kpi-catalogue.cjs\`.`,
  `> **Total Registered KPIs:** ${kpis.length}`,
  "",
  "---",
  "",
  "## Summary Matrix",
  "",
  "| Scope | Count |",
  "| :--- | :--- |",
  `| **SCHOOL** | ${kpis.filter((k) => k.scope === "SCHOOL").length} |`,
  `| **PLATFORM** | ${kpis.filter((k) => k.scope === "PLATFORM").length} |`,
  `| **Total** | **${kpis.length}** |`,
  "",
  "---",
  "",
  "## Full KPI Definitions",
  "",
  "| ID | Name | Module | Scope | Period | Unit | Required Module | Formula |",
  "| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
];

for (const kpi of kpis) {
  const reqMod = kpi.requiredModule ? `\`${kpi.requiredModule}\`` : "*none*";
  const formulaEscaped = (kpi.formula || "").replace(/\|/g, "\\|");
  lines.push(
    `| \`${kpi.id}\` | **${kpi.name}** | \`${kpi.ownerModule}\` | \`${kpi.scope}\` | \`${kpi.periodType}\` | \`${kpi.unit}\` | ${reqMod} | \`${formulaEscaped}\` |`
  );
}

lines.push("");
lines.push("---");
lines.push("");
lines.push("## KPI Specifications by Domain");
lines.push("");

const domainGroups = [
  { title: "Academic & Student Operations", module: "ACADEMICS" },
  { title: "Financial & Revenue Operations", module: "FINANCE" },
  { title: "Examinations & Grading", module: "EXAMS" },
  { title: "Human Resources & Staff Payroll", module: "HR_PAYROLL" },
  { title: "Campus Operations (Hostel, Library, Inventory)", modules: ["HOSTEL", "LIBRARY", "INVENTORY"] },
  { title: "Communications & Alerts", module: "COMMUNICATIONS" },
  { title: "SaaS Platform & Multi-Tenancy Health", module: "PLATFORM" },
];

for (const group of domainGroups) {
  lines.push(`### ${group.title}`);
  lines.push("");
  const groupKpis = kpis.filter((k) =>
    group.modules ? group.modules.includes(k.ownerModule) : k.ownerModule === group.module
  );

  for (const kpi of groupKpis) {
    lines.push(`#### \`${kpi.id}\` — ${kpi.name}`);
    lines.push(`- **Owner Module:** \`${kpi.ownerModule}\``);
    lines.push(`- **Scope:** \`${kpi.scope}\``);
    lines.push(`- **Measurement Period:** \`${kpi.periodType}\``);
    lines.push(`- **Metric Unit:** \`${kpi.unit}\``);
    if (kpi.requiredModule) {
      lines.push(`- **Required Module Entitlement:** \`${kpi.requiredModule}\``);
    }
    lines.push(`- **Mathematical Formula:** \`${kpi.formula}\``);
    lines.push("");
  }
}

const outputContent = lines.join("\n");

if (isCheckMode) {
  if (!fs.existsSync(catalogueFile)) {
    console.error(`Error: Catalogue file does not exist at ${catalogueFile}. Run without --check to generate.`);
    process.exit(1);
  }
  const currentContent = fs.readFileSync(catalogueFile, "utf8");
  if (currentContent !== outputContent) {
    console.error("Error: docs/KPI/KPI_CATALOGUE.md is out of sync with src/kpi/registry.ts!");
    console.error("Run `node scripts/generate-kpi-catalogue.cjs` to synchronize.");
    process.exit(1);
  }
  console.log(`✅ docs/KPI/KPI_CATALOGUE.md is up to date (${kpis.length} KPIs registered).`);
} else {
  fs.writeFileSync(catalogueFile, outputContent, "utf8");
  console.log(`✅ Generated docs/KPI/KPI_CATALOGUE.md with ${kpis.length} KPIs.`);
}
