const fs = require('fs');

const openapi = JSON.parse(fs.readFileSync('openapi.json', 'utf8'));
const paths = openapi.paths;

const modules = {};
let endpointCount = 0;

for (const [path, methods] of Object.entries(paths)) {
  const parts = path.split('/');
  // path usually looks like /api/v1/module/...
  const mod = parts[3] || 'root';
  if (!modules[mod]) modules[mod] = [];
  
  for (const [method, details] of Object.entries(methods)) {
    endpointCount++;
    modules[mod].push({
      method: method.toUpperCase(),
      path,
      summary: details.summary || `${method.toUpperCase()} ${path}`
    });
  }
}

let md = `### Endpoints Map (${endpointCount} Endpoints across ${Object.keys(modules).length} Route Modules)\n\n`;
md += 'This section auto-documents the endpoints currently live in the system, extracted directly from the routing layer via the OpenAPI 3.1.0 generator.\n\n';

for (const mod of Object.keys(modules).sort()) {
  md += `#### Module: \`${mod}\`\n`;
  md += '| Method | Path | Summary |\n|---|---|---|\n';
  modules[mod].forEach(route => {
    md += `| **${route.method}** | \`${route.path}\` | ${route.summary} |\n`;
  });
  md += '\n';
}

fs.writeFileSync('generated_markdown.txt', md);
console.log('Done!');
