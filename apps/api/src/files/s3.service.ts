import {
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';

export type HeadObjectResult = {
  contentType?: string;
  contentLength?: number;
};

export type ObjectStreamResult = {
  body: Readable;
  contentType?: string;
  contentLength?: number;
};

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
    const region = process.env.S3_REGION ?? 'us-east-1';
    const accessKeyId = process.env.S3_ACCESS_KEY ?? 'minioadmin';
    const secretAccessKey = process.env.S3_SECRET_KEY ?? 'minioadmin';
    this.bucket = process.env.S3_BUCKET ?? 'webnote';

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async createPresignedPutUrl(
    storageKey: string,
    mimeType: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        ContentType: mimeType,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async createPresignedGetUrl(
    storageKey: string,
    expiresInSeconds = 900,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async getObjectStream(storageKey: string): Promise<ObjectStreamResult> {
    const result = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );

    if (!result.Body) {
      throw new Error('Empty S3 object body');
    }

    return {
      body: result.Body as Readable,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  async headObject(storageKey: string): Promise<HeadObjectResult> {
    const result = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );

    return {
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }
}
