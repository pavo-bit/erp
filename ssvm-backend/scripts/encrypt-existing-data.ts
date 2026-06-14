import { PrismaClient } from "@prisma/client";
import { ENCRYPTED_FIELDS } from "../src/lib/encryption";
// Import the base client without middleware so we read the raw unencrypted data!
import prisma from "../src/lib/prisma";

async function runMigration() {
  const isDryRun = process.argv.includes("--dry-run");
  console.log(`Starting PII Encryption Migration... ${isDryRun ? "[DRY RUN]" : ""}`);

  for (const [modelName, fields] of Object.entries(ENCRYPTED_FIELDS)) {
    console.log(`\nProcessing Model: ${modelName} (Fields: ${fields.join(", ")})`);

    // We must read RAW unencrypted data and write back through the middleware.
    // However, the prismaClient we imported HAS the middleware.
    // So if we read it, the middleware will try to decrypt it.
    // Since it's plaintext, decrypt() catches the error and returns the plaintext.
    // That works perfectly! The middleware passes through plaintext on read.

    // @ts-ignore
    const model = prisma[modelName.charAt(0).toLowerCase() + modelName.slice(1)];
    
    let skip = 0;
    const batchSize = 100;
    let totalProcessed = 0;
    let totalUpdated = 0;

    while (true) {
      const records = await model.findMany({
        skip,
        take: batchSize,
        orderBy: { id: "asc" }
      });

      if (records.length === 0) break;

      for (const record of records) {
        totalProcessed++;
        
        // We need to re-save the record to trigger the encryption middleware ON WRITE.
        // But only if there is actually PII data to encrypt.
        let hasDataToEncrypt = false;
        const updateData: Record<string, string> = {};

        for (const field of fields) {
          if (record[field]) {
            // Check if already encrypted (starts with base64 IV structure roughly)
            const parts = record[field].split(":");
            if (parts.length !== 3) {
              hasDataToEncrypt = true;
              updateData[field] = record[field]; // This is plaintext. Updating it will run it through the middleware's encrypt().
            }
          }
        }

        if (hasDataToEncrypt) {
          if (!isDryRun) {
            try {
              await model.update({
                where: { id: record.id },
                data: updateData
              });
              totalUpdated++;
            } catch (error) {
              console.error(`❌ Failed to update ${modelName} ID: ${record.id}`, error);
            }
          } else {
            totalUpdated++;
          }
        }
      }

      console.log(`Processed ${totalProcessed} ${modelName} records...`);
      skip += batchSize;
    }

    console.log(`✅ Finished ${modelName}: Processed ${totalProcessed}, Needed Encryption ${totalUpdated}`);
  }

  console.log("\nMigration complete.");
  process.exit(0);
}

runMigration().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
