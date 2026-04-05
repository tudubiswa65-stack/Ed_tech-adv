'use client';

import { useEffect } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { queryClient } from '@/lib/queryClient';
import { adminQueryKeys } from '@/hooks/queries/useAdminQueries';
import { superAdminQueryKeys } from '@/hooks/queries/useSuperAdminQueries';
import { studentQueryKeys } from '@/hooks/queries/useStudentQueries';

/**
 * Subscribes to Supabase Realtime INSERT events on the notifications table.
 * When a new notification is created, immediately invalidates the badge count
 * queries for the relevant role — so the notification bell updates live without
 * waiting for the next polling interval.
 *
 * Falls back silently to the existing polling strategy if Realtime is not
 * available (e.g. missing env vars or network error).
 *
 * @param role - The current user's role. Controls which query keys are invalidated.
 */
export function useRealtimeNotifications(role: string | undefined) {
  useEffect(() => {
    if (!role) return;

    // Guard against missing Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return;
    }

    const channelName = `notifications-badge-${role}`;

    const channel = supabaseClient
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          // Immediately refetch the badge count for the relevant role
          if (role === 'student') {
            queryClient.invalidateQueries({
              queryKey: studentQueryKeys.unreadCount(),
            });
          } else if (role === 'super_admin') {
            queryClient.invalidateQueries({
              queryKey: [...superAdminQueryKeys.all, 'notifications-count'],
            });
            // Also refresh the notifications list if it is open
            queryClient.invalidateQueries({
              queryKey: [...superAdminQueryKeys.all, 'notifications'],
            });
          } else if (role === 'admin' || role === 'branch_admin') {
            queryClient.invalidateQueries({
              queryKey: [...adminQueryKeys.all, 'notifications-count'],
            });
            // Also refresh the notifications list if it is open
            queryClient.invalidateQueries({
              queryKey: [...adminQueryKeys.all, 'notifications'],
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [role]);
}
