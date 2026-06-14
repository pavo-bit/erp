import { Prisma } from "@prisma/client";
import { ENCRYPTED_FIELDS, encrypt, decrypt } from "./encryption";

export const encryptionExtension = Prisma.defineExtension({
  name: 'encryption',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        // ON WRITE (create, update, createMany, updateMany, upsert)
        if (model && ENCRYPTED_FIELDS[model]) {
          const fieldsToEncrypt = ENCRYPTED_FIELDS[model];

          if (operation === "create" || operation === "update" || operation === "upsert") {
            const data = operation === "upsert" 
              ? (args as any).create 
              : (args as any).data;

            if (data) {
              fieldsToEncrypt.forEach(field => {
                if (data[field] !== undefined && data[field] !== null) {
                  data[field] = encrypt(data[field] as string);
                }
              });
            }

            if (operation === "upsert" && (args as any).update) {
               fieldsToEncrypt.forEach(field => {
                if ((args as any).update[field] !== undefined && (args as any).update[field] !== null) {
                  (args as any).update[field] = encrypt((args as any).update[field] as string);
                }
              });
            }
          }
          
          if (operation === "createMany" || operation === "updateMany") {
            const data = (args as any).data;
            if (Array.isArray(data)) {
              data.forEach(item => {
                fieldsToEncrypt.forEach(field => {
                  if (item[field] !== undefined && item[field] !== null) {
                    item[field] = encrypt(item[field] as string);
                  }
                });
              });
            } else if (data) {
              fieldsToEncrypt.forEach(field => {
                if (data[field] !== undefined && data[field] !== null) {
                  data[field] = encrypt(data[field] as string);
                }
              });
            }
          }
        }

        // Execute the query
        const result = await query(args);

        // ON READ (findUnique, findFirst, findMany, findUniqueOrThrow, findFirstOrThrow)
        if (model && ENCRYPTED_FIELDS[model]) {
          const fieldsToDecrypt = ENCRYPTED_FIELDS[model];
          
          if (
            operation === "findUnique" ||
            operation === "findFirst" ||
            operation === "findUniqueOrThrow" ||
            operation === "findFirstOrThrow"
          ) {
            if (result) {
              fieldsToDecrypt.forEach(field => {
                const record = result as Record<string, any>;
                if (record[field] !== undefined && record[field] !== null) {
                  record[field] = decrypt(record[field] as string);
                }
              });
            }
          }
          
          if (operation === "findMany") {
            if (Array.isArray(result)) {
              result.forEach(item => {
                fieldsToDecrypt.forEach(field => {
                  const record = item as Record<string, any>;
                  if (record[field] !== undefined && record[field] !== null) {
                    record[field] = decrypt(record[field] as string);
                  }
                });
              });
            }
          }
        }

        return result;
      }
    }
  }
});
