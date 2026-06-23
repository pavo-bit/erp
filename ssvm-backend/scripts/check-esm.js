const fs = require('fs');
const path = require('path');

console.log("🔍 Scanning dependencies for ESM-only packages...");

const packageJsonPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const deps = Object.keys(pkg.dependencies || {});
let hasEsm = false;

for (const dep of deps) {
  try {
    const depPkgPath = require.resolve(`${dep}/package.json`, { paths: [path.join(__dirname, '..')] });
    const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));

    // Check if the package explicitly declares itself as an ES module
    if (depPkg.type === 'module') {
      // Allow dual-publish packages by checking if they have a CommonJS export
      const hasCjsExport = depPkg.exports && (depPkg.exports.require || (typeof depPkg.exports === 'object' && Object.values(depPkg.exports).some(e => e.require)));
      const hasMain = depPkg.main && !depPkg.main.endsWith('.mjs');
      
      if (!hasCjsExport && !hasMain) {
        console.error(`\nWARNING:\n${dep}@${depPkg.version} detected\nESM-only package found`);
        hasEsm = true;
      }
    }
  } catch (err) {
    // Some packages don't expose package.json in exports, we'll try a basic require test
    try {
      require(dep);
    } catch (reqErr) {
      if (reqErr.code === 'ERR_REQUIRE_ESM') {
        console.error(`\nWARNING:\n${dep} detected\nESM-only package found (failed require test)`);
        hasEsm = true;
      }
    }
  }
}

// Hardcoded checks for known ESM-only packages just in case
const knownEsm = ['chalk', 'node-fetch', 'got', 'nanoid'];
for (const dep of deps) {
  if (knownEsm.includes(dep)) {
    console.error(`\nWARNING:\n${dep} detected\nKnown ESM-only package found`);
    hasEsm = true;
  }
}

if (hasEsm) {
  console.error("\n❌ Build blocked. Incompatible ESM packages detected.");
  process.exit(1);
} else {
  console.log("✅ All dependencies are CommonJS compatible.");
}
