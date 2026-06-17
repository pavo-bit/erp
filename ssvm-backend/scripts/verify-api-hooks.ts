import fs from 'fs';
import path from 'path';

/**
 * Very basic script to check if URLs used in api-hooks.ts match mounted routes.
 * A full implementation would parse the Express AST, but a simple string matching 
 * is a good first step to prevent typos.
 */
function verifyHooks() {
  const hooksPath = path.join(process.cwd(), '../erp-admin/src/lib/api-hooks.ts');
  const appTsPath = path.join(process.cwd(), 'src/app.ts');
  const routesDir = path.join(process.cwd(), 'src/routes');

  if (!fs.existsSync(hooksPath) || !fs.existsSync(appTsPath)) {
    console.warn("Paths not found, run this from ssvm-backend directory.");
    return;
  }

  const hooksContent = fs.readFileSync(hooksPath, 'utf8');
  
  // Extract all strings starting with /api/v1/
  const regex = /\/api\/v1\/([a-zA-Z0-9_-]+)/g;
  const matches = [...hooksContent.matchAll(regex)];
  
  const baseUrls = new Set(matches.map(m => m[1]));
  console.log(`Found ${baseUrls.size} base API paths in hooks...`);

  const appTsContent = fs.readFileSync(appTsPath, 'utf8');
  
  let missing = 0;
  baseUrls.forEach(url => {
    // Check if app.use("/api/v1/URL", ...) exists in app.ts
    // or if it's explicitly handled
    if (!appTsContent.includes(`"/api/v1/${url}"`) && 
        !appTsContent.includes(`'/api/v1/${url}'`) &&
        !appTsContent.includes(`"/api/v1/${url}/`)) {
      console.error(`❌ WARNING: Hook path /api/v1/${url} not found mounted in app.ts`);
      missing++;
    } else {
      console.log(`✅ Hook path /api/v1/${url} verified`);
    }
  });

  if (missing === 0) {
    console.log("All hooks seem to match a mounted route!");
  } else {
    console.warn(`Found ${missing} potentially broken base routes.`);
  }
}

verifyHooks();
