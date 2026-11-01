#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { Prisma } = require("@prisma/client");

const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");
const jsonPath = path.join(repoRoot, "docs", "DATABASE", "TENANT_CLASSIFICATION.json");
const tsPath = path.join(backendRoot, "src", "generated", "tenantClassification.ts");
const rlsMigrationPath = path.join(backendRoot, "prisma", "migrations", "20261101150000_generated_tenant_rls", "migration.sql");
const migrationsPath = path.join(backendRoot, "prisma", "migrations");
const mode = process.argv[2];

if (mode !== "--write" && mode !== "--check") {
  throw new Error("Usage: node scripts/generate-tenant-classification.cjs --write|--check");
}

const prismaModels = Prisma.dmmf.datamodel.models;
const byName = new Map(prismaModels.map((model) => [model.name, model]));
const migrationSql = fs.readdirSync(migrationsPath, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(migrationsPath, entry.name, "migration.sql"))
  .filter((filePath) => fs.existsSync(filePath))
  .map((filePath) => fs.readFileSync(filePath, "utf8"))
  .join("\n");
const migratedTables = new Set(
  [...migrationSql.matchAll(/CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+["`]?([A-Za-z0-9_]+)/gi)]
    .map((match) => match[1])
);
const directNames = new Set(
  prismaModels
    .filter((model) => model.fields.some((field) => field.name === "schoolId" && field.kind === "scalar"))
    .map((model) => model.name)
);

function getEdges(model) {
  const edges = [];
  for (const field of model.fields.filter((candidate) => candidate.kind === "object")) {
    const target = byName.get(field.type);
    if (!target || !field.relationName) continue;

    if (field.relationFromFields.length > 0) {
      edges.push({
        relation: field.name,
        relatedModel: target.name,
        cardinality: field.isList ? "many" : "one",
        foreignKeyModel: model.name,
        foreignKeyFields: field.relationFromFields,
        referencedFields: field.relationToFields,
      });
      continue;
    }

  }
  return edges;
}

const edgeMap = new Map(prismaModels.map((model) => [model.name, getEdges(model)]));

function findTenantPath(startName) {
  const queue = [{ modelName: startName, path: [] }];
  const visited = new Set([startName]);
  while (queue.length > 0) {
    const current = queue.shift();
    for (const edge of edgeMap.get(current.modelName) ?? []) {
      if (visited.has(edge.relatedModel)) continue;
      const nextPath = [...current.path, edge];
      if (directNames.has(edge.relatedModel)) return nextPath;
      visited.add(edge.relatedModel);
      queue.push({ modelName: edge.relatedModel, path: nextPath });
    }
  }
  return null;
}

const models = prismaModels
  .map((model) => {
    const dbTable = model.dbName ?? model.name;
    const migrationCoverage = migratedTables.has(dbTable) ? "PRESENT" : "MISSING";
    const schoolField = model.fields.find((field) => field.name === "schoolId" && field.kind === "scalar");
    const relations = model.fields
      .filter((field) => field.kind === "object")
      .map((field) => ({
        relation: field.name,
        relatedModel: field.type,
        cardinality: field.isList ? "many" : "one",
        foreignKeyFields: field.relationFromFields,
        referencedFields: field.relationToFields,
      }));
    if (schoolField) {
      return {
        model: model.name,
        table: dbTable,
        migrationCoverage,
        classification: "direct",
        schoolIdField: schoolField.name,
        schoolIdColumn: schoolField.dbName ?? schoolField.name,
        path: [],
        relations,
        verification: "UNVERIFIED",
        score: 0,
      };
    }

    const pathToTenant = findTenantPath(model.name);
    if (pathToTenant) {
      return {
        model: model.name,
        table: dbTable,
        migrationCoverage,
        classification: "indirect",
        schoolIdField: null,
        schoolIdColumn: null,
        path: pathToTenant.map((edge) => {
          const source = byName.get(edge.foreignKeyModel);
          const target = byName.get(edge.relatedModel);
          return {
            relation: edge.relation,
            relatedModel: edge.relatedModel,
            cardinality: edge.cardinality,
            foreignKeyModel: edge.foreignKeyModel,
            foreignKeyColumns: edge.foreignKeyFields.map((name) => source.fields.find((field) => field.name === name)?.dbName ?? name),
            referencedColumns: edge.referencedFields.map((name) => target.fields.find((field) => field.name === name)?.dbName ?? name),
          };
        }),
        relations,
        verification: "UNVERIFIED",
        score: 0,
      };
    }

    return {
      model: model.name,
      table: dbTable,
      migrationCoverage,
      classification: "global",
      schoolIdField: null,
      schoolIdColumn: null,
      path: [],
      relations,
      verification: "UNVERIFIED",
      score: 0,
    };
  })
  .sort((left, right) => left.model.localeCompare(right.model));

const output = {
  schema: "ssvm-backend/prisma/schema.prisma",
  generatedBy: "ssvm-backend/scripts/generate-tenant-classification.cjs",
  modelCount: models.length,
  directCount: models.filter((model) => model.classification === "direct").length,
  indirectCount: models.filter((model) => model.classification === "indirect").length,
  globalCount: models.filter((model) => model.classification === "global").length,
  tenantModelsWithMigrations: models.filter((model) => model.classification !== "global" && model.migrationCoverage === "PRESENT").length,
  tenantModelsMissingMigrations: models.filter((model) => model.classification !== "global" && model.migrationCoverage === "MISSING").length,
  verification: "UNVERIFIED",
  score: 0,
  models,
};

const jsonText = `${JSON.stringify(output, null, 2)}\n`;
const classifiedEntries = models.map((model) => [model.model, model]);
const tenantModelNames = models.filter((model) => model.classification !== "global").map((model) => model.model);
const rlsModels = models.filter((model) => model.classification !== "global");
const tenantTables = rlsModels.map((model) => model.table);
const tenantModuleText = [
  "// Generated by scripts/generate-tenant-classification.cjs; do not edit manually.",
  `export const TENANT_CLASSIFICATION = ${JSON.stringify(Object.fromEntries(classifiedEntries), null, 2)} as const;`,
  "",
  `export const TENANT_MODEL_NAMES = ${JSON.stringify(tenantModelNames, null, 2)} as const;`,
  `export const TENANT_RLS_MODELS = ${JSON.stringify(rlsModels.map((model) => model.model), null, 2)} as const;`,
  `export const TENANT_RLS_TABLES = ${JSON.stringify(tenantTables, null, 2)} as const;`,
  "",
].join("\n");

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteSqlString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function renderPolicyPredicate(model) {
  if (model.classification === "direct") {
    return `${quoteIdentifier(model.schoolIdColumn)} = current_tenant_id()`;
  }

  const joins = [];
  const firstConditions = [];
  let previousAlias = null;
  for (const [index, step] of model.path.entries()) {
    const related = byName.get(step.relatedModel);
    const alias = `tenant_ref_${index}`;
    const table = related.dbName ?? related.name;
    const comparisons = step.foreignKeyColumns.map((foreignKeyColumn, fieldIndex) => {
      const left = previousAlias ? `${quoteIdentifier(previousAlias)}.${quoteIdentifier(foreignKeyColumn)}` : `${quoteIdentifier(model.table)}.${quoteIdentifier(foreignKeyColumn)}`;
      const right = `${quoteIdentifier(alias)}.${quoteIdentifier(step.referencedColumns[fieldIndex])}`;
      return `${left} = ${right}`;
    });
    if (index === 0) {
      firstConditions.push(...comparisons);
      joins.push(`FROM ${quoteIdentifier(table)} AS ${quoteIdentifier(alias)}`);
    } else {
      joins.push(`JOIN ${quoteIdentifier(table)} AS ${quoteIdentifier(alias)} ON ${comparisons.join(" AND ")}`);
    }
    previousAlias = alias;
  }

  const finalTenantModel = byName.get(model.path[model.path.length - 1].relatedModel);
  const finalSchoolColumn = finalTenantModel.fields.find((field) => field.name === "schoolId")?.dbName ?? "schoolId";
  return `EXISTS (SELECT 1 ${joins.join(" ")} WHERE ${[...firstConditions, `${quoteIdentifier(previousAlias)}.${quoteIdentifier(finalSchoolColumn)} = current_tenant_id()`].join(" AND ")})`;
}

function renderRlsMigration() {
  const statements = rlsModels.map((model) => {
    const predicate = renderPolicyPredicate(model);
    return [
      `  IF to_regclass(format('%I.%I', 'public', ${quoteSqlString(model.table)})) IS NULL THEN`,
      `    RAISE EXCEPTION 'Classified tenant table public.${model.table} is missing; apply the complete baseline schema before tenant RLS.';`,
      "  END IF;",
      `  EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 'public', ${quoteSqlString(model.table)});`,
      `  EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', 'public', ${quoteSqlString(model.table)});`,
      `  EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 'school_isolation', 'public', ${quoteSqlString(model.table)});`,
      `  EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (${predicate}) WITH CHECK (${predicate})', 'school_isolation', 'public', ${quoteSqlString(model.table)});`,
    ].join("\n");
  });
  return [
    "-- Generated from docs/DATABASE/TENANT_CLASSIFICATION.json; do not edit manually.",
    "-- No NULL-tenant wildcard: missing tenant context denies access.",
    "-- The audited super-admin path must use its separate privileged connection.",
    "DO $tenant_rls$",
    "BEGIN",
    ...statements,
    "END",
    "$tenant_rls$;",
    "",
  ].join("\n");
}

const rlsMigrationText = renderRlsMigration();

function assertCurrentFile(filePath, expectedText) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Classification output is missing: ${path.relative(repoRoot, filePath)}. Run the generator with --write.`);
  }
  const currentText = fs.readFileSync(filePath, "utf8");
  if (currentText !== expectedText) {
    if (filePath !== jsonPath) {
      throw new Error(`${path.relative(repoRoot, filePath)} is stale. Run the generator with --write.`);
    }
    const currentModels = JSON.parse(currentText).models.map((model) => model.model);
    const currentSet = new Set(currentModels);
    const newModels = models.map((model) => model.model).filter((model) => !currentSet.has(model));
    const removedModels = currentModels.filter((model) => !byName.has(model));
    const detail = [
      newModels.length > 0 ? `New unclassified models: ${newModels.join(", ")}` : "Classification metadata is stale.",
      removedModels.length > 0 ? `Removed models still listed: ${removedModels.join(", ")}` : "",
    ].filter(Boolean).join(" ");
    throw new Error(`${path.relative(repoRoot, filePath)} does not match Prisma DMMF. ${detail} Run the generator with --write and review all UNVERIFIED classifications.`);
  }
}

if (mode === "--check") {
  assertCurrentFile(jsonPath, jsonText);
  assertCurrentFile(tsPath, tenantModuleText);
  assertCurrentFile(rlsMigrationPath, rlsMigrationText);
  console.log(`Tenant classification is current: ${models.length} models (${output.directCount} direct, ${output.indirectCount} indirect, ${output.globalCount} global); ${output.tenantModelsWithMigrations} classified tenant models have migration tables, ${output.tenantModelsMissingMigrations} do not. All remain UNVERIFIED, score 0.`);
} else {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.mkdirSync(path.dirname(tsPath), { recursive: true });
  fs.mkdirSync(path.dirname(rlsMigrationPath), { recursive: true });
  fs.writeFileSync(jsonPath, jsonText);
  fs.writeFileSync(tsPath, tenantModuleText);
  fs.writeFileSync(rlsMigrationPath, rlsMigrationText);
  console.log(`Wrote tenant classification for ${models.length} models; ${output.tenantModelsWithMigrations} tenant models have migration tables, ${output.tenantModelsMissingMigrations} do not. Review required; all entries are UNVERIFIED, score 0.`);
}
