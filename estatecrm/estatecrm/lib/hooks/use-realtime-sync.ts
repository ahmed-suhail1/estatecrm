'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAgentStore } from '@/lib/stores/agent-store';
import { toast } from 'sonner';

/**
 * Subscribes to Postgres changes on the tables that drive live UI, and
 * invalidates the relevant React Query caches so every connected browser
 * reflects writes from any agent within ~1s, with no polling.
 *
 * We invalidate rather than manually patching the cache: with 5-15 users
 * and moderate write volume, refetch-on-invalidate is simpler and less
 * bug-prone than hand-rolled cache surgery for every event shape, while
 * still feeling instant in practice.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient();
  const currentAgent = useAgentStore((s) => s.currentAgent);

  useEffect(() => {
    const channel = supabase
      .channel('estatecrm-global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, () => {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_notes' }, () => {
        queryClient.invalidateQueries({ queryKey: ['property-notes'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'property_events' }, () => {
        queryClient.invalidateQueries({ queryKey: ['property-events'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, () => {
        queryClient.invalidateQueries({ queryKey: ['activity-feed'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['tasks-due-today-count'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites' }, () => {
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          const row = payload.new as { recipient_agent_id: string; title: string };
          if (currentAgent && row.recipient_agent_id === currentAgent.id) {
            toast(row.title);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAgent?.id]);
}
