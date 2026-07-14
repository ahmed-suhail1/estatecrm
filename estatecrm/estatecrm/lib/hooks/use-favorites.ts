'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAgentStore } from '@/lib/stores/agent-store';
import { useMemo } from 'react';

export function useFavorites() {
  const currentAgent = useAgentStore((s) => s.currentAgent);
  return useQuery({
    queryKey: ['favorites', currentAgent?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('property_id')
        .eq('agent_id', currentAgent!.id);
      if (error) throw error;
      return data.map((f) => f.property_id);
    },
    enabled: !!currentAgent,
  });
}

export function useFavoritesSet(): Set<string> {
  const { data } = useFavorites();
  return useMemo(() => new Set(data ?? []), [data]);
}
