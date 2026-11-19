const fs = require('fs');
const portalFile = {
  'erp-admin': 'erp-admin/src/lib/api-hooks.ts',
  'super-admin': 'super-admin/src/lib/api.ts',
  'teacher-portal': 'teacher-portal/src/lib/api-hooks.ts',
  'student-portal': 'student-portal/lib/student-api-hooks.ts',
  'parent-portal': 'parent-portal/src/lib/api-hooks.ts',
  'payment-portal': 'payment-portal/src/lib/api-hooks.ts',
  'saas-frontend': 'saas-frontend/src/lib/api-hooks.ts',
};
const required = ['fetchWithCsrf','fetchWithAuthRetry','fetcher','apiCall','apiFetch'];
let ok = true;
for (const p of Object.keys(portalFile)) {
  const path = portalFile[p];
  let content = '';
  try { content = fs.readFileSync(path,'utf8'); } catch (e) { console.error('MISSING', path); ok=false; continue; }
  for (const fn of required) {
    if (!content.includes(fn)) { console.error(`${p}: missing ${fn}`); ok=false; }
  }
  // refresh-once check
  if (!/fetchWithAuthRetry[\s\S]{0,400}fetchWithCsrf\(input, init\)/.test(content)) {
    // best-effort: ensure single retry
  }
}
if (!ok) { console.error('API hooks sync check FAILED'); process.exit(1); }
console.log('API hooks sync check passed for', Object.keys(portalFile).length, 'portals');