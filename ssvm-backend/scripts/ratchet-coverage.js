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

let ratchet = {
  lines: 0,
  statements: 0,
  functions: 0,
  branches: 0,
};

if (fs.existsSync(ratchetPath)) {
  ratchet = JSON.parse(fs.readFileSync(ratchetPath, 'utf-8'));
}

const current = {
  lines: Math.floor(total.lines.pct * 100) / 100,
  statements: Math.floor(total.statements.pct * 100) / 100,
  functions: Math.floor(total.functions.pct * 100) / 100,
  branches: Math.floor(total.branches.pct * 100) / 100,
};

console.log('Current coverage:', current);
console.log('Ratchet thresholds:', ratchet);

let regressed = false;
for (const key of ['lines', 'statements', 'functions', 'branches']) {
  if (current[key] < (ratchet[key] || 0)) {
    console.error(`Coverage regression on ${key}: current ${current[key]}% < ratchet ${ratchet[key]}%`);
    regressed = true;
  }
}

if (regressed) {
  process.exit(1);
}

// Ratchet only moves up
const shouldUpdate = process.argv.includes('--update');
if (shouldUpdate) {
  const updated = {
    lines: Math.max(ratchet.lines || 0, current.lines),
    statements: Math.max(ratchet.statements || 0, current.statements),
    functions: Math.max(ratchet.functions || 0, current.functions),
    branches: Math.max(ratchet.branches || 0, current.branches),
  };
  fs.writeFileSync(ratchetPath, JSON.stringify(updated, null, 2) + '\n');
  console.log('Coverage ratchet updated to:', updated);
} else {
  console.log('Coverage ratchet check passed.');
}
