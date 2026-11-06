const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const evidenceDir = path.resolve(rootDir, '..', 'docs', 'AUDIT', 'evidence');
const outDir = path.resolve(rootDir, '..', 'docs', 'AUDIT');

function isAncestor(sha) {
  if (!sha) return false;
  try {
    execSync(`git merge-base --is-ancestor ${sha} HEAD`, { cwd: path.resolve(rootDir, '..'), stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

const files = fs.readdirSync(evidenceDir).filter((f) => f.endsWith('.json'));
const evidence = [];
const flagged = [];

for (const f of files) {
  const raw = fs.readFileSync(path.join(evidenceDir, f), 'utf-8');
  let json;
  try { json = JSON.parse(raw); } catch (e) { continue; }
  const entries = Array.isArray(json.entries) ? json.entries : (Array.isArray(json) ? json : []);
  for (const entry of entries) {
    const sha = entry.commitSha || entry.commit || null;
    const ancestor = isAncestor(sha);
    const record = { file: f, lane: json.lane || f.replace('.json',''), ...entry, commitIsAncestor: ancestor };
    evidence.push(record);
    if (!ancestor) flagged.push(record);
  }
}

const consolidated = {
  generatedAt: new Date().toISOString(),
  head: execSync('git rev-parse HEAD', { cwd: path.resolve(rootDir, '..'), encoding: 'utf-8' }).trim(),
  evidenceCount: evidence.length,
  flaggedCount: flagged.length,
  flagged: flagged.map((e) => ({ file: e.file, commitSha: e.commitSha || e.commit, command: e.command })),
  evidence,
};

fs.writeFileSync(path.join(outDir, 'CONSOLIDATED_AUDIT.json'), JSON.stringify(consolidated, null, 2) + '\n');

let md = '# Consolidated Audit\n\n';
md += `Generated at ${consolidated.generatedAt}\n\n`;
md += `HEAD: ${consolidated.head}\n\n`;
md += `Evidence entries: ${consolidated.evidenceCount}\n\n`;
if (flagged.length) {
  md += '## Flagged evidence (commit not an ancestor of HEAD)\n\n';
  for (const f of flagged) {
    md += `- ${f.file}: ${f.commitSha || f.commit} — ${f.command || ''}\n`;
  }
  md += '\n';
}
md += '## Entries\n\n';
for (const e of evidence) {
  md += `- [${e.lane || e.file}] ${e.command || ''} (${e.commitSha || e.commit || 'no-sha'}) ${e.commitIsAncestor ? '' : '⚠️ NOT ANCESTOR'}\n`;
}
fs.writeFileSync(path.join(outDir, 'CONSOLIDATED_AUDIT.md'), md);
console.log(`Combined ${files.length} evidence files, ${evidence.length} entries, ${flagged.length} flagged.`);
