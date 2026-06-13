import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import logger from '../lib/logger';
import { getEnv } from '../config/env';

export class StorageService {
  private static s3Client: S3Client;

  public static getClient(): S3Client {
    if (!this.s3Client) {
      const env = getEnv();
      this.s3Client = new S3Client({
        region: env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
        },
      });
    }
    return this.s3Client;
  }

  /**
   * Generates a pre-signed URL for direct browser uploads to S3.
   * This offloads file transfer from the Node.js server.
   */
  static async getUploadUrl(schoolId: string, userId: string, fileName: string, mimeType: string, size: number) {
    const env = getEnv();
    const bucket = env.AWS_S3_BUCKET || 'ssvm-storage';
    const key = `schools/${schoolId}/uploads/${uuidv4()}-${fileName.replace(/\s+/g, '-')}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      Metadata: {
        schoolId,
        userId
      }
    });

    const uploadUrl = await getSignedUrl(this.getClient(), command, { expiresIn: 3600 }); // 1 hour

    // Save a pending record in the DB
    const storageObject = await prisma.storageObject.create({
      data: {
        key,
        bucket,
        size,
        mimeType,
        uploadedBy: userId,
        schoolId,
        scanStatus: 'PENDING'
      }
    });

    return { uploadUrl, key, storageObjectId: storageObject.id };
  }

  /**
   * Generates a pre-signed URL to download/view a private file.
   */
  static async getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const env = getEnv();
    const bucket = env.AWS_S3_BUCKET || 'ssvm-storage';

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    return getSignedUrl(this.getClient(), command, { expiresIn });
  }

  /**
   * Deletes an object from S3 and the database.
   */
  static async deleteObject(key: string): Promise<boolean> {
    const env = getEnv();
    const bucket = env.AWS_S3_BUCKET || 'ssvm-storage';

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      await this.getClient().send(command);

      await prisma.storageObject.delete({
        where: { key }
      });

      return true;
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete storage object');
      return false;
    }
  }

  /**
   * Updates scan status after a malware scan (e.g., ClamAV webhook)
   */
  static async updateScanStatus(key: string, status: 'CLEAN' | 'INFECTED'): Promise<void> {
    await prisma.storageObject.update({
      where: { key },
      data: { scanStatus: status }
    });
  }
}
