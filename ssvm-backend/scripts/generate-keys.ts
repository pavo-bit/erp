import crypto from "crypto";
import fs from "fs";
import path from "path";

function generateKeys(prefix: string) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return {
    privateKey: `${prefix}_PRIVATE_KEY="${privateKey.replace(/\n/g, "\\n")}"`,
    publicKey: `${prefix}_PUBLIC_KEY="${publicKey.replace(/\n/g, "\\n")}"`,
  };
}

const accessKeys = generateKeys("ACCESS_TOKEN");
const refreshKeys = generateKeys("REFRESH_TOKEN");

console.log("\n--- Add these to your .env file ---\n");
console.log(accessKeys.privateKey);
console.log(accessKeys.publicKey);
console.log(refreshKeys.privateKey);
console.log(refreshKeys.publicKey);
console.log("\n-----------------------------------\n");
