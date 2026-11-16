#!/usr/bin/env node
/**
 * scripts/check-metrics-vocabulary.cjs
 *
 * SSVM ERP — Prometheus Metrics Vocabulary CI Validator
 *
 * Verifies that:
 * 1. Every metric declared in ssvm-backend/src/middleware/metrics.ts carries the "ssvm_" prefix.
 * 2. Every metric identifier referenced in prometheus/alert.rules.yml exists in the backend registry.
 * 3. Every metric identifier referenced in grafana/dashboards/*.json exists in the backend registry.
 *
 * Fails with exit code 1 on any mismatch or unauthorized metric name.
 */

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const metricsTsPath = path.join(repoRoot, "ssvm-backend", "src", "middleware", "metrics.ts");
const alertRulesPath = path.join(repoRoot, "prometheus", "alert.rules.yml");
const dashboardsDir = path.join(repoRoot, "grafana", "dashboards");

// 1. Load TypeScript and prom-client
let ts;
try {
  ts = require("typescript");
} catch {
  ts = require(path.resolve(repoRoot, "ssvm-backend", "node_modules", "typescript"));
}

let promClient;
try {
  promClient = require("prom-client");
} catch {
  promClient = require(path.resolve(repoRoot, "ssvm-backend", "node_modules", "prom-client"));
}
const prom = promClient.default ? promClient.default : promClient;

// 2. Transpile and evaluate ssvm-backend/src/middleware/metrics.ts
if (!fs.existsSync(metricsTsPath)) {
  console.error(`❌ Metrics source file not found at ${metricsTsPath}`);
  process.exit(1);
}

const metricsSource = fs.readFileSync(metricsTsPath, "utf8");
const jsCode = ts.transpileModule(metricsSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;

const mockModule = { exports: {} };
const customRequire = (id) => {
  if (id === "prom-client") {
    return promClient;
  }
  return {};
};

try {
  const runner = new Function("require", "exports", "module", jsCode);
  runner(customRequire, mockModule.exports, mockModule);
} catch (err) {
  console.error("❌ Failed to evaluate metrics module:", err);
  process.exit(1);
}

const register = mockModule.exports.register;
if (!register) {
  console.error("❌ Exported 'register' Registry not found in metrics.ts");
  process.exit(1);
}

// 3. Inspect registered metrics
(async () => {
  const registeredMetrics = await register.getMetricsAsJSON();
  const validIdentifiers = new Set();
  const baseMetricNames = new Set();

  for (const metric of registeredMetrics) {
    if (!metric.name.startsWith("ssvm_")) {
      console.error(`❌ Non-prefixed metric detected in registry: ${metric.name}`);
      process.exit(1);
    }

    baseMetricNames.add(metric.name);
    validIdentifiers.add(metric.name);

    if (metric.type === "histogram") {
      validIdentifiers.add(`${metric.name}_bucket`);
      validIdentifiers.add(`${metric.name}_sum`);
      validIdentifiers.add(`${metric.name}_count`);
    } else if (metric.type === "summary") {
      validIdentifiers.add(`${metric.name}_sum`);
      validIdentifiers.add(`${metric.name}_count`);
    }
  }

  console.log(`[metrics-check] Loaded ${baseMetricNames.size} base metrics (${validIdentifiers.size} valid PromQL identifiers) from backend.`);

  // 4. Validate alert.rules.yml
  let hasErrors = false;
  const referencedInAlerts = new Set();

  if (fs.existsSync(alertRulesPath)) {
    const alertRulesText = fs.readFileSync(alertRulesPath, "utf8");
    const matches = alertRulesText.match(/ssvm_[a-zA-Z0-9_]+/g) || [];
    for (const m of matches) {
      referencedInAlerts.add(m);
      if (!validIdentifiers.has(m)) {
        console.error(`❌ Alert rules reference unknown metric: '${m}' in ${alertRulesPath}`);
        hasErrors = true;
      }
    }
  } else {
    console.warn(`⚠️ Alert rules file not found at ${alertRulesPath}`);
  }

  // 5. Validate grafana/dashboards/*.json
  const referencedInDashboards = new Set();
  if (fs.existsSync(dashboardsDir)) {
    const dashboardFiles = fs.readdirSync(dashboardsDir).filter(f => f.endsWith(".json"));
    for (const file of dashboardFiles) {
      const filePath = path.join(dashboardsDir, file);
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const json = JSON.parse(content);
        const matches = content.match(/ssvm_[a-zA-Z0-9_]+/g) || [];
        for (const m of matches) {
          referencedInDashboards.add(m);
          if (!validIdentifiers.has(m)) {
            console.error(`❌ Dashboard '${file}' references unknown metric: '${m}'`);
            hasErrors = true;
          }
        }
      } catch (err) {
        console.error(`❌ Failed to parse dashboard JSON: ${file}:`, err.message);
        hasErrors = true;
      }
    }
  }

  const allReferenced = new Set([...referencedInAlerts, ...referencedInDashboards]);
  console.log(`[metrics-check] Validated ${allReferenced.size} unique metrics referenced in alert rules and dashboards.`);

  if (hasErrors) {
    console.error("❌ Metrics vocabulary check FAILED. Mismatched metric names found.");
    process.exit(1);
  }

  console.log("✅ All metric names in alert rules and dashboards exist in backend exports with 'ssvm_' prefix.");
  process.exit(0);
})();
