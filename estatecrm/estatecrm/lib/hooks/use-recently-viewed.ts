'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAgentStore } from '@/lib/stores/agent-store';
import type { PropertyWithRelations } from '@/types/database';

export function useRecentlyViewed(limit = 6) {
  const currentAgent = useAgentStore((s) => s.currentAgent);
  return useQuery({
    queryKey: ['recently-viewed', currentAgent?.id, limit],
    queryFn: async (): Promise<PropertyWithRelations[]> => {
      const { data, error } = await supabase
        .from('recently_viewed')
        .select('viewed_at, property:properties(*, images:property_images(*))')
        .eq('agent_id', currentAgent!.id)
        .order('viewed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? [])
        .map((r) => r.property)
        .filter(Boolean) as unknown as PropertyWithRelations[];
    },
    enabled: !!currentAgent,
  });
}
