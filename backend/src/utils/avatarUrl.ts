import { supabaseAdmin } from '../db/supabaseAdmin';

/**
 * Signed URL validity in seconds.  Short enough to limit sharing while long
 * enough for a browser to finish rendering the image within a normal page view.
 */
export const AVATAR_SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

/**
 * Converts a stored avatar value (a storage file path, or a legacy public URL)
 * into a fresh, short-lived signed URL.
 *
 * Storage file paths are stored as-is after the migration to private buckets
 * (e.g. "avatars/institute-id/user-id/avatar.jpg").
 *
 * Legacy public URLs (pre-migration, start with "https://") have their file
 * path extracted so we can still issue a signed URL from them without a
 * database migration.
 *
 * Returns null when the input is empty or the signed URL cannot be generated.
 */
export async function toSignedAvatarUrl(
  avatarValue: string | null | undefined
): Promise<string | null> {
  if (!avatarValue) return null;

  let filePath: string;

  if (avatarValue.startsWith('http')) {
    // Legacy public URL — extract the path within the "avatars" bucket.
    // Supabase public URL pattern:
    //   https://<project>.supabase.co/storage/v1/object/public/avatars/<filePath>
    const match = avatarValue.match(/\/object\/public\/avatars\/(.+?)(?:\?.*)?$/);
    if (!match) return null;
    filePath = match[1];
  } else {
    filePath = avatarValue;
  }

  const { data, error } = await supabaseAdmin.storage
    .from('avatars')
    .createSignedUrl(filePath, AVATAR_SIGNED_URL_EXPIRY_SECONDS);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
