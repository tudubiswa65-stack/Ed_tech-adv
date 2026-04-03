/**
 * Shared avatar file validation utility.
 * Validates file type and size before uploading to the server.
 */

export const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
export const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

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
    return { valid: false, error: 'Image must be smaller than 5 MB.' };
  }
  return { valid: true };
}
