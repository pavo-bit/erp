import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "../config/env";
import logger from "../lib/logger";
import { v4 as uuidv4 } from "uuid";
import path from "path";

class StorageService {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || "ssvm-erp-bucket";
    this.s3 = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "dummy",
        secretAccessKey: process.env.S3_SECRET_KEY || "dummy",
      },
    });
  }

  /**
   * Upload a file to S3/R2
   */
  async uploadFile(fileBuffer: Buffer, mimetype: string, originalName: string, prefix: string = "docs"): Promise<string> {
    const ext = path.extname(originalName);
    const key = `${prefix}/${uuidv4()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
    });

    await this.s3.send(command);
    logger.info({ key }, "File uploaded successfully");
    
    return key;
  }

  /**
   * Generate a pre-signed URL for secure, temporary access
   */
  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // We use a dummy command for GetObject just to sign it, even though we don't import GetObjectCommand explicitly to save imports if not using it for fetching
    // Wait, getSignedUrl needs the command object. We should import GetObjectCommand.
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn });
    return url;
  }

  /**
   * Delete a file from S3/R2
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3.send(command);
    logger.info({ key }, "File deleted successfully");
  }
}

export const storageService = new StorageService();
