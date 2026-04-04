/**
 * Client-side localStorage cache for signed avatar URLs.
 *
 * Signed URLs are valid for 60 minutes (backend AVATAR_SIGNED_URL_EXPIRY_SECONDS).
 * We cache for 50 minutes so the URL is always refreshed before it actually
 * expires, eliminating the expiry-overlap window.
 *
 * Keys are scoped per user ID so that multiple users on the same device never
 * share each other's cached URL.
 */

const CACHE_DURATION_MS = 50 * 60 * 1000; // 50 minutes

interface AvatarCacheEntry {
  url: string;
  timestamp: number;
}

function cacheKey(userId: string): string {
  return `avatar_url_${userId}`;
}

/**
 * Returns the cached signed URL for the given user if it is still within the
 * 50-minute window, otherwise removes the stale entry and returns null.
 */
export function getCachedAvatar(userId: string): string | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const entry: AvatarCacheEntry = JSON.parse(raw);
    // Validate that the stored value has the expected shape before trusting it.
    if (typeof entry?.url !== 'string' || typeof entry?.timestamp !== 'number') {
      localStorage.removeItem(cacheKey(userId));
      return null;
    }
    if (Date.now() - entry.timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(cacheKey(userId));
      return null;
    }
    return entry.url;
  } catch {
    return null;
  }
}

/**
 * Stores a signed URL for the given user with the current timestamp.
 */
export function setCachedAvatar(userId: string, url: string): void {
  try {
    const entry: AvatarCacheEntry = { url, timestamp: Date.now() };
    localStorage.setItem(cacheKey(userId), JSON.stringify(entry));
  } catch {
    // localStorage may be unavailable (SSR, private browsing quota exceeded)
  }
}

/**
 * Removes the cached signed URL for the given user.  Call this immediately
 * after the user uploads a new profile picture so the stale URL is not reused.
 */
export function clearCachedAvatar(userId: string): void {
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {
    // Ignore — nothing to clear
  }
}
