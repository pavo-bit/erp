/**
 * scripts/check-lint-ratchet.cjs
 *
 * Runs ESLint on ssvm-backend/src and verifies that problem counts (errors and warnings)
 * do not exceed the baseline recorded in lint-baseline.json.
 * Fails with exit code 1 if any increase is detected.
 */

const fs = require('fs');
const path = require('path');
const { ESLint } = require('eslint');

async function main() {
  const backendDir = path.resolve(__dirname, '..');
  const baselinePath = path.join(backendDir, 'lint-baseline.json');

  if (!fs.existsSync(baselinePath)) {
    console.error(`ERROR: Baseline file not found at ${baselinePath}`);
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  console.log(`[lint-ratchet] Pinned baseline from commit ${baseline.commitSha.slice(0, 7)}:`);
  console.log(`  Allowed errors:   ${baseline.errors}`);
  console.log(`  Allowed warnings: ${baseline.warnings}`);
  console.log(`  Total problems:   ${baseline.totalProblems}`);

  const eslint = new ESLint({ cwd: backendDir });
  const results = await eslint.lintFiles(['src/']);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const r of results) {
    totalErrors += r.errorCount;
    totalWarnings += r.warningCount;
  }
  const totalProblems = totalErrors + totalWarnings;

  // Format output using stylish formatter
  const formatter = await eslint.loadFormatter('stylish');
  const resultText = await formatter.format(results);
  if (resultText && resultText.trim().length > 0) {
    console.log(resultText);
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`[lint-ratchet] Evaluation:`);
  console.log(`  Current errors:   ${totalErrors} (baseline: ${baseline.errors})`);
  console.log(`  Current warnings: ${totalWarnings} (baseline: ${baseline.warnings})`);
  console.log(`  Total problems:   ${totalProblems} (baseline: ${baseline.totalProblems})`);
  console.log('--------------------------------------------------------------------------------');

  let failed = false;

  if (totalErrors > baseline.errors) {
    console.error(`❌ LINT RATCHET FAILED: Error count increased by ${totalErrors - baseline.errors}! (${baseline.errors} -> ${totalErrors})`);
    failed = true;
  }

  if (totalWarnings > baseline.warnings) {
    console.error(`❌ LINT RATCHET FAILED: Warning count increased by ${totalWarnings - baseline.warnings}! (${baseline.warnings} -> ${totalWarnings})`);
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  if (totalErrors < baseline.errors || totalWarnings < baseline.warnings) {
    console.log(`🎉 LINT IMPROVED: Errors decreased from ${baseline.errors} to ${totalErrors} (net ${totalErrors - baseline.errors}).`);
  } else {
    console.log(`✅ LINT RATCHET PASSED: No increase in errors or warnings.`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[lint-ratchet] Unexpected error running lint ratchet check:', err);
  process.exit(1);
});
