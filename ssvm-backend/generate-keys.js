const crypto = require('crypto');
const fs = require('fs');
const { generateKeyPairSync } = crypto;

const { privateKey: accessPriv, publicKey: accessPub } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

const { privateKey: refPriv, publicKey: refPub } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

let env = fs.readFileSync('.env', 'utf8');

env += '\nACCESS_TOKEN_PRIVATE_KEY="' + accessPriv.replace(/\n/g, '\\n') + '"\n';
env += 'ACCESS_TOKEN_PUBLIC_KEY="' + accessPub.replace(/\n/g, '\\n') + '"\n';
env += 'REFRESH_TOKEN_PRIVATE_KEY="' + refPriv.replace(/\n/g, '\\n') + '"\n';
env += 'REFRESH_TOKEN_PUBLIC_KEY="' + refPub.replace(/\n/g, '\\n') + '"\n';
env += 'FIELD_ENCRYPTION_KEY="' + crypto.randomBytes(32).toString('hex') + '"\n';

fs.writeFileSync('.env', env);
console.log('Keys generated and added to .env');
