'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

/**
 * Client-side wrapper that provides the React Query context to the component
 * tree. Must be a 'use client' component because QueryClientProvider uses
 * React context, which is not available in server components.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
