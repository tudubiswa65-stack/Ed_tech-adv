import { QueryClient } from '@tanstack/react-query';

// Global QueryClient shared across the application.
// staleTime: 5 minutes — data is considered fresh and won't be re-fetched on
//   window focus or component remount within this window.
// gcTime (formerly cacheTime): 10 minutes — cached data is kept in memory for
//   this long after all subscribers unmount, so quick back-navigation is instant.
// retry: 1 — retry once on failure to handle transient network errors.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 minutes
      gcTime: 10 * 60 * 1000,     // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false, // Avoid surprise refetch when user alt-tabs
    },
  },
});
