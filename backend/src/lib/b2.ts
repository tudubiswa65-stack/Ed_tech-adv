import { S3Client } from '@aws-sdk/client-s3';

/**
 * Backblaze B2 S3-compatible client.
 * Import only in backend/server-side code — never on the frontend.
 */
export const s3 = new S3Client({
  endpoint: process.env.B2_ENDPOINT,
  region: 'us-west-001',
  credentials: {
    accessKeyId: process.env.B2_KEY_ID!,
    secretAccessKey: process.env.B2_APP_KEY!,
  },
  forcePathStyle: true, // required for B2 S3-compatible API
});

export const B2_BUCKET = process.env.B2_BUCKET!;
