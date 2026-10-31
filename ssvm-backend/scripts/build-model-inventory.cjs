const fs = require("node:fs");
const path = require("node:path");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const schema = fs.readFileSync(schemaPath, "utf8");
const models = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)].map((match) => ({
  name: match[1],
  body: match[2],
  line: schema.slice(0, match.index).split("\n").length,
}));

console.log(`# Prisma Model Inventory\n\nUpdated: ${new Date().toISOString().slice(0, 10)}\n\nGenerated from the Prisma schema. Direct schoolId presence is syntactic evidence only. Each model still requires a business ownership classification and an enforcement decision. No model is marked tenant-safe by this inventory.\n\nTotal models: **${models.length}**. Models with a direct schoolId field: **${models.filter((model) => /^\s*schoolId\s+/m.test(model.body)).length}**.\n\n| Model | Direct schoolId field | Candidate identity from model name | Classification | Enforcement review | Schema line |\n|---|---:|---|---|---|---:|`);
for (const model of models) {
  const tenantField = /^\s*schoolId\s+/m.test(model.body) ? "Yes" : "No";
  const tick = String.fromCharCode(96);
  console.log(`| ${tick}${model.name}${tick} | ${tenantField} | ${model.name} | UNCLASSIFIED | REVIEW_REQUIRED | ${model.line} |`);
}
