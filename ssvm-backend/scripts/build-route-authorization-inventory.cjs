const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const sourceRoot = path.join(__dirname, "..", "src");
const appFile = path.join(sourceRoot, "app.ts");
const appText = fs.readFileSync(appFile, "utf8");
const app = ts.createSourceFile(appFile, appText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const routeImports = new Map();
const mounts = [];
const methodNames = new Set(["get", "post", "put", "patch", "delete", "options", "head", "all"]);

function literal(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return null;
}

function walk(node, visit) {
  visit(node);
  ts.forEachChild(node, child => walk(child, visit));
}

walk(app, node => {
  if (ts.isImportDeclaration(node) && node.importClause?.name && ts.isStringLiteral(node.moduleSpecifier)) {
    routeImports.set(node.importClause.name.text, path.resolve(sourceRoot, `${node.moduleSpecifier.text}.ts`));
  }
  if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
  if (node.expression.expression.getText(app) !== "app" || node.expression.name.text !== "use") return;
  const prefix = literal(node.arguments[0]);
  if (prefix === null) return;
  const identifier = [...node.arguments.slice(1)].reverse().find(ts.isIdentifier);
  if (identifier && routeImports.has(identifier.text)) mounts.push({ prefix, file: routeImports.get(identifier.text) });
});

const routeRows = [];
const files = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (entry.isFile() && entry.name.endsWith(".ts")) files.push(full);
  }
}
collect(path.join(sourceRoot, "routes"));

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let routerName = "router";
  walk(source, node => {
    if (!ts.isVariableDeclaration(node) || !ts.isIdentifier(node.name) || !node.initializer || !ts.isCallExpression(node.initializer)) return;
    const initializer = node.initializer.expression.getText(source);
    if (initializer === "Router" || initializer.endsWith(".Router")) routerName = node.name.text;
  });
  walk(source, node => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    if (node.expression.expression.getText(source) !== routerName || !methodNames.has(node.expression.name.text)) return;
    const routePath = literal(node.arguments[0]);
    if (routePath === null) return;
    const middleware = node.arguments.slice(1).map(arg => {
      if (ts.isIdentifier(arg)) return arg.text;
      if (ts.isCallExpression(arg)) return arg.expression.getText(source);
      return "inline handler";
    }).filter(name => name !== "inline handler");
    const relative = path.relative(path.join(sourceRoot, "routes"), file).replaceAll(path.sep, "/");
    const mounted = mounts.filter(item => item.file === file);
    for (const mount of mounted) {
      const endpoint = `${mount.prefix.replace(/\/$/, "")}/${routePath.replace(/^\//, "")}`.replace(/\/$/, "") || "/";
      routeRows.push({ method: node.expression.name.text.toUpperCase(), endpoint, module: relative, middleware });
    }
  });
}

routeRows.sort((a, b) => a.endpoint.localeCompare(b.endpoint) || a.method.localeCompare(b.method) || a.module.localeCompare(b.module));
console.log(`# Route Authorization Matrix (Generated Inventory)\n\nUpdated: ${new Date().toISOString().slice(0, 10)}\n\nThis inventory is mechanically extracted from route declarations and mounts. Middleware names are shown as clues only. Inline checks, inherited router middleware, ownership constraints, tenant scope, input validation and audit behavior have not been semantically verified. All rows remain **REVIEW_REQUIRED** until individually inspected and tested. Dynamic route strings and nested router mounts may require manual completion.\n\n| Method | Endpoint | Router file | Declared middleware | Access policy status |\n|---|---|---|---|---|`);
for (const row of routeRows) {
  console.log(`| ${row.method} | \`${row.endpoint}\` | \`${row.module}\` | ${row.middleware.length ? `\`${row.middleware.join(", ")}\`` : "(inline/inherited)"} | REVIEW_REQUIRED |`);
}
console.log(`\nExtracted declarations: ${routeRows.length}. This is an inventory aid, not evidence of route security.`);
