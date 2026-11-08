"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCRYPTED_FIELDS = void 0;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const env_1 = require("../config/env");
exports.ENCRYPTED_FIELDS = {
    Student: ['aadhaarNo'],
    Guardian: ['primaryPhone', 'alternatePhone', 'primaryEmail'],
    Teacher: ['phone', 'aadhaarNo'],
    User: ['phone'],
};
function encrypt(plaintext) {
    if (plaintext == null)
        return plaintext;
    const env = (0, env_1.getEnv)();
    const key = Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv("aes-256-gcm", key, iv);
    let ciphertext = cipher.update(plaintext, "utf8", "base64");
    ciphertext += cipher.final("base64");
    const authTag = cipher.getAuthTag().toString("base64");
    return `${iv.toString("base64")}:${authTag}:${ciphertext}`;
}
function decrypt(ciphertext) {
    if (ciphertext == null)
        return ciphertext;
    // If it doesn't look like our encrypted format, return as is (for backwards compatibility/migrations)
    const parts = ciphertext.split(":");
    if (parts.length !== 3)
        return ciphertext;
    try {
        const env = (0, env_1.getEnv)();
        const key = Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");
        const [ivBase64, authTagBase64, cipherBase64] = parts;
        const iv = Buffer.from(ivBase64, "base64");
        const authTag = Buffer.from(authTagBase64, "base64");
        const decipher = crypto_1.default.createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(authTag);
        let plaintext = decipher.update(cipherBase64, "base64", "utf8");
        plaintext += decipher.final("utf8");
        return plaintext;
    }
    catch (error) {
        // If decryption fails, it might not have been encrypted or key changed
        console.error("Decryption failed for ciphertext:", ciphertext);
        return ciphertext;
    }
}
