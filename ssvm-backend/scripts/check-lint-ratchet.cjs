/**
 * scripts/check-lint-ratchet.cjs
 *
 * Runs ESLint on ssvm-backend/src and verifies that problem counts (errors and warnings)
 * do not exceed the baseline recorded in lint-baseline.json.
 *
 * Features:
 *  - Total-count ratchet: fails if total errors/warnings increase.
 *  - Auto-lower: when counts drop, the baseline file is updated automatically.
 *  - Per-file mode (--per-file or LINT_PER_FILE=1): fails if any single file's
 *    error count increases or a new file adds errors.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ESLint } = require('eslint');

async function main() {
  const perFileMode =
    process.argv.includes('--per-file') || process.env.LINT_PER_FILE === '1';

  const backendDir = path.resolve(__dirname, '..');
  const baselinePath = path.join(backendDir, 'lint-baseline.json');

  if (!fs.existsSync(baselinePath)) {
    console.error(`ERROR: Baseline file not found at ${baselinePath}`);
    process.exit(1);
  }

  const baselineRaw = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  const baseline = baselineRaw;
  // Normalize file keys to forward slashes
  if (baseline.files) {
    const normalized = {};
    for (const [k, v] of Object.entries(baseline.files)) {
      normalized[k.replace(/\\/g, '/')] = v;
    }
    baseline.files = normalized;
  }
  console.log(`[lint-ratchet] Pinned baseline from commit ${String(baseline.commitSha).slice(0, 7)}:`);
  console.log(`  Allowed errors:   ${baseline.errors}`);
  console.log(`  Allowed warnings: ${baseline.warnings}`);
  console.log(`  Total problems:   ${baseline.totalProblems}`);
  if (perFileMode) console.log('  Mode: per-file');

  const eslint = new ESLint({ cwd: backendDir });
  const results = await eslint.lintFiles(['src/']);

  let totalErrors = 0;
  let totalWarnings = 0;
  const currentFiles = {};

  for (const r of results) {
    totalErrors += r.errorCount;
    totalWarnings += r.warningCount;
    const rel = path.relative(backendDir, r.filePath).replace(/\\/g, '/');
    currentFiles[rel] = r.errorCount;
  }
  const totalProblems = totalErrors + totalWarnings;

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

  // Per-file mode
  if (perFileMode) {
    const baseFiles = baseline.files || {};
    for (const [file, count] of Object.entries(currentFiles)) {
      if (count > 0) {
        const baseCount = Object.prototype.hasOwnProperty.call(baseFiles, file)
          ? baseFiles[file]
          : 0;
        if (baseCount === 0 && count > 0 && !Object.prototype.hasOwnProperty.call(baseFiles, file)) {
          // new file adding errors
          console.error(`❌ LINT RATCHET (per-file): New file ${file} added ${count} error(s).`);
          failed = true;
        } else if (count > baseCount) {
          console.error(`❌ LINT RATCHET (per-file): ${file} errors increased ${baseCount} -> ${count}.`);
          failed = true;
        }
      }
    }
    // Also detect files in baseline that no longer exist? not a failure.
  }

  if (failed) {
    process.exit(1);
  }

  // Auto-lower baseline when counts drop
  const improved =
    totalErrors < (baseline.errors || 0) ||
    totalWarnings < (baseline.warnings || 0);

  let newCommitSha = baseline.commitSha;
  try {
    newCommitSha = execSync('git rev-parse HEAD', { cwd: backendDir, encoding: 'utf-8' }).trim();
  } catch (e) {
    // ignore
  }

  if (improved || perFileMode) {
    const updated = {
      commitSha: newCommitSha,
      command: baseline.command || 'npm run lint in ssvm-backend',
      errors: Math.min(baseline.errors || totalErrors, totalErrors),
      warnings: Math.min(baseline.warnings || totalWarnings, totalWarnings),
      totalProblems: Math.min(baseline.totalProblems || totalProblems, totalProblems),
      files: {},
    };
    // per-file ratchet: take min per file
    const baseFiles = baseline.files || {};
    const allFiles = new Set([...Object.keys(baseFiles), ...Object.keys(currentFiles)]);
    for (const f of allFiles) {
      const baseVal = baseFiles[f] != null ? baseFiles[f] : 0;
      const curVal = currentFiles[f] != null ? currentFiles[f] : 0;
      updated.files[f] = Math.min(baseVal, curVal);
    }
    fs.writeFileSync(baselinePath, JSON.stringify(updated, null, 2) + '\n');
    console.log(`[lint-ratchet] Baseline auto-updated to: errors=${updated.errors}, warnings=${updated.warnings}.`);
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
