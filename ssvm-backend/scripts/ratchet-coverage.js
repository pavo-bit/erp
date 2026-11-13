const fs = require('fs');
const path = require('path');

const summaryPath = path.resolve(__dirname, '../coverage/coverage-summary.json');
const ratchetPath = path.resolve(__dirname, '../coverage-ratchet.json');

if (!fs.existsSync(summaryPath)) {
  console.error('No coverage summary found at', summaryPath);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
const total = summary.total;

function normalize(p) { return p.replace(/\\/g, '/'); }

function matchGlob(filePath, pattern) {
  const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
  return re.test(filePath);
}

let ratchet = { lines: 0, statements: 0, functions: 0, branches: 0, modules: {} };
if (fs.existsSync(ratchetPath)) {
  try { ratchet = { ...ratchet, ...JSON.parse(fs.readFileSync(ratchetPath, 'utf-8')) }; } catch (e) {}
  if (!ratchet.modules) ratchet.modules = {};
}

const current = {
  lines: Math.floor(total.lines.pct * 100) / 100,
  statements: Math.floor(total.statements.pct * 100) / 100,
  functions: Math.floor(total.functions.pct * 100) / 100,
  branches: Math.floor(total.branches.pct * 100) / 100,
};

console.log('Current coverage:', current);
console.log('Ratchet thresholds:', { lines: ratchet.lines, statements: ratchet.statements, functions: ratchet.functions, branches: ratchet.branches });

let regressed = false;
for (const key of ['lines', 'statements', 'functions', 'branches']) {
  if (current[key] < (ratchet[key] || 0)) {
    console.error(`Coverage regression on ${key}: current ${current[key]}% < ratchet ${ratchet[key]}%`);
    regressed = true;
  }
}

// Per-module checks
const moduleThresholds = ratchet.modules || {};
for (const [pattern, thr] of Object.entries(moduleThresholds)) {
  // find matching files in summary
  const matching = Object.keys(summary).filter((k) => k !== 'total' && matchGlob(normalize(k).replace(/^.*ssvm-backend\//, ''), pattern));
  if (matching.length === 0) {
    // module not present in coverage; skip enforcement but keep threshold
    continue;
  }
  for (const file of matching) {
    const data = summary[file];
    const cur = {
      lines: Math.floor(data.lines.pct * 100) / 100,
      statements: Math.floor(data.statements.pct * 100) / 100,
      functions: Math.floor(data.functions.pct * 100) / 100,
      branches: Math.floor(data.branches.pct * 100) / 100,
    };
    for (const key of ['lines', 'statements', 'functions', 'branches']) {
      const t = (thr && thr[key]) != null ? thr[key] : 0;
      if (cur[key] < t) {
        console.error(`Coverage regression on ${pattern} (${file}) ${key}: current ${cur[key]}% < ratchet ${t}%`);
        regressed = true;
      }
    }
  }
}

if (regressed) {
  process.exit(1);
}

// Auto-raise
const shouldUpdate = !process.argv.includes('--no-update');
if (shouldUpdate) {
  const updated = {
    lines: Math.max(ratchet.lines || 0, current.lines),
    statements: Math.max(ratchet.statements || 0, current.statements),
    functions: Math.max(ratchet.functions || 0, current.functions),
    branches: Math.max(ratchet.branches || 0, current.branches),
    modules: {},
  };
  // preserve module patterns
  for (const [pattern, thr] of Object.entries(moduleThresholds)) {
    const matching = Object.keys(summary).filter((k) => k !== 'total' && matchGlob(normalize(k).replace(/^.*ssvm-backend\//, ''), pattern));
    let newThr = { ...(thr || {}) };
    if (matching.length > 0) {
      // raise to max over matching files' current? Use min? Per-module threshold should be current value of that module.
      // For a single module, raise to its current coverage.
      for (const file of matching) {
        const data = summary[file];
        const cur = {
          lines: Math.floor(data.lines.pct * 100) / 100,
          statements: Math.floor(data.statements.pct * 100) / 100,
          functions: Math.floor(data.functions.pct * 100) / 100,
          branches: Math.floor(data.branches.pct * 100) / 100,
        };
        for (const key of ['lines', 'statements', 'functions', 'branches']) {
          newThr[key] = Math.max(newThr[key] || 0, cur[key]);
        }
      }
    }
    updated.modules[pattern] = newThr;
  }
  // ensure target modules present even if no coverage
  const defaultTargets = ['src/lib/prisma.ts','src/routes/payments.ts','src/routes/auth.ts','src/middleware/auth*.ts','src/lib/money.ts','src/services/BankReconciliationService.ts'];
  for (const t of defaultTargets) {
    if (!updated.modules[t]) updated.modules[t] = moduleThresholds[t] || { lines: 0, statements: 0, functions: 0, branches: 0 };
  }
  fs.writeFileSync(ratchetPath, JSON.stringify(updated, null, 2) + '\n');
  console.log('Coverage ratchet updated to:', updated);
} else {
  console.log('Coverage ratchet check passed.');
}
