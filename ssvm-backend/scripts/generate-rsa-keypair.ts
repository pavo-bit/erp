import crypto from 'crypto';

/**
 * GAP A2 - JWT RS256 Migration
 * Run this script to generate 2048-bit RSA key pairs for Access and Refresh tokens.
 * Usage: npx ts-node scripts/generate-rsa-keypair.ts
 */
function generateKeyPairs() {
  console.log("Generating RSA 2048-bit key pairs...\n");

  const { publicKey: accessPublic, privateKey: accessPrivate } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  const { publicKey: refreshPublic, privateKey: refreshPrivate } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });

  console.log("Update your .env with the following values (newlines are escaped as \\n):\n");

  console.log(`ACCESS_TOKEN_PRIVATE_KEY="${accessPrivate.replace(/\n/g, '\\n')}"\n`);
  console.log(`ACCESS_TOKEN_PUBLIC_KEY="${accessPublic.replace(/\n/g, '\\n')}"\n`);
  console.log(`REFRESH_TOKEN_PRIVATE_KEY="${refreshPrivate.replace(/\n/g, '\\n')}"\n`);
  console.log(`REFRESH_TOKEN_PUBLIC_KEY="${refreshPublic.replace(/\n/g, '\\n')}"\n`);
  
  console.log("\nNote: Keep your existing ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET in the .env file");
  console.log("during the rollover window to allow active sessions to be verified using the fallback logic.");
}

generateKeyPairs();
