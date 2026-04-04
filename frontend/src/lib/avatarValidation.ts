/**
 * Shared avatar file validation utility.
 * Validates file type and size before uploading to the server.
 */

export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export interface AvatarValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates an avatar file for allowed MIME type and maximum size.
 * Returns `{ valid: true }` on success or `{ valid: false, error: string }` on failure.
 */
export function validateAvatarFile(file: File): AvatarValidationResult {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return { valid: false, error: 'Only JPG, PNG, GIF, or WebP images are allowed.' };
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return { valid: false, error: 'Image is too large (max 2 MB). Please resize your image before uploading.' };
  }
  return { valid: true };
}

/**
 * Appends a cache-busting timestamp query parameter to a URL so the browser
 * fetches the latest version of the image after an upsert (Supabase keeps the
 * same public URL path when overwriting a file).
 */
export function addAvatarCacheBuster(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}
