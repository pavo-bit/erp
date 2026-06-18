const fs = require('fs');

const docPath = '../ssvm_openapi_documentation.md';
let doc = fs.readFileSync(docPath, 'utf8');

const newSection = fs.readFileSync('generated_markdown.txt', 'utf8');

const startIndex = doc.indexOf('### Endpoints Map');
const endIndex = doc.indexOf('## 5. Frontend Application Structure');

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find section boundaries');
  process.exit(1);
}

// Find the --- just before ## 5
const sliceToSearch = doc.slice(0, endIndex);
const lastDashIndex = sliceToSearch.lastIndexOf('---');

if (lastDashIndex === -1 || lastDashIndex < startIndex) {
  console.error('Could not find end dash');
  process.exit(1);
}

// Ensure proper spacing
const updatedDoc = doc.slice(0, startIndex) + newSection + doc.slice(lastDashIndex);

fs.writeFileSync(docPath, updatedDoc);
console.log('Successfully updated OpenAPI documentation markdown!');
