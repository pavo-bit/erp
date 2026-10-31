import crypto from "node:crypto";

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/ssvm_test?schema=public";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.ACCESS_TOKEN_PRIVATE_KEY = privateKey;
process.env.ACCESS_TOKEN_PUBLIC_KEY = publicKey;
process.env.REFRESH_TOKEN_PRIVATE_KEY = privateKey;
process.env.REFRESH_TOKEN_PUBLIC_KEY = publicKey;
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
