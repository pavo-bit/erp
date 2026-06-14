import crypto from "crypto";
import { getEnv } from "../config/env";

export const ENCRYPTED_FIELDS: Record<string, string[]> = {
  Student: ['aadhaarNo'],
  Guardian: ['primaryPhone', 'alternatePhone', 'primaryEmail'],
  Teacher: ['phone', 'aadhaarNo'],
  User: ['phone'],
};

export function encrypt(plaintext: string | null | undefined): string | null | undefined {
  if (plaintext == null) return plaintext;
  const env = getEnv();
  const key = Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");
  
  return `${iv.toString("base64")}:${authTag}:${ciphertext}`;
}

export function decrypt(ciphertext: string | null | undefined): string | null | undefined {
  if (ciphertext == null) return ciphertext;
  
  // If it doesn't look like our encrypted format, return as is (for backwards compatibility/migrations)
  const parts = ciphertext.split(":");
  if (parts.length !== 3) return ciphertext;

  try {
    const env = getEnv();
    const key = Buffer.from(env.FIELD_ENCRYPTION_KEY, "hex");
    const [ivBase64, authTagBase64, cipherBase64] = parts;
    const iv = Buffer.from(ivBase64, "base64");
    const authTag = Buffer.from(authTagBase64, "base64");
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(cipherBase64, "base64", "utf8");
    plaintext += decipher.final("utf8");
    return plaintext;
  } catch (error) {
    // If decryption fails, it might not have been encrypted or key changed
    console.error("Decryption failed for ciphertext:", ciphertext);
    return ciphertext;
  }
}
