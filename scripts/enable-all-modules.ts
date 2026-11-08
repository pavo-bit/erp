/**
 * scripts/enable-all-modules.ts
 * Thin wrapper delegating to authoritative backend implementation
 * in ssvm-backend/scripts/enable-all-modules.ts
 */

import { runEnableAllModules } from "../ssvm-backend/scripts/enable-all-modules";

if (require.main === module) {
  runEnableAllModules()
    .then((result) => {
      console.log(`\nWrapper finished: ${result.affectedSchools.length} tenant school(s) verified.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("\nExecution failed:", err.message || err);
      process.exit(1);
    });
}

export { runEnableAllModules };
