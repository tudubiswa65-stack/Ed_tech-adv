import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { s3, B2_BUCKET } from './b2';

/**
 * Derive a safe file extension from a MIME type.
 */
function extFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/csv': 'csv',
    'text/plain': 'txt',
  };
  return map[mimeType] ?? 'bin';
}

/**
 * Upload a file buffer to Backblaze B2.
 *
 * @param buffer       Raw file bytes
 * @param originalName Original file name (used only to infer a folder prefix)
 * @param mimeType     MIME type of the file
 * @param folder       Optional bucket sub-folder prefix (e.g. "gallery/thumbnails")
 * @returns            The object key (path within the bucket) of the uploaded file
 */
export async function uploadFileToB2(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  folder = 'uploads'
): Promise<string> {
  const ext = extFromMime(mimeType);
  const key = `${folder}/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: B2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  return key;
}

/**
 * Delete a file from Backblaze B2 by its object key.
 * Failures are swallowed and logged so they never break the main request flow.
 */
export async function deleteFileFromB2(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: B2_BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.warn('[fileService] B2 delete failed for key', key, err);
  }
}

/**
 * Generate a presigned GET URL for a B2 object.
 *
 * @param key              Object key (path within the bucket)
 * @param expiresInSeconds URL validity in seconds (default: 3600)
 * @returns                Short-lived presigned URL
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: B2_BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Return true when the stored value looks like a legacy Supabase storage URL
 * rather than a plain B2 object key.
 */
export function isLegacySupabaseUrl(value: string): boolean {
  return /^https?:\/\/[^/]*\.supabase\.co\/storage\//.test(value);
}
