'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import type { ActivityFeedItem, Agent } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export function useActivityFeed(limit = 30) {
  return useQuery({
    queryKey: ['activity-feed', limit],
    queryFn: async (): Promise<(ActivityFeedItem & { agent: Agent | null })[]> => {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*, agent:agents(*)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as (ActivityFeedItem & { agent: Agent | null })[];
    },
  });
}

export function ActivityFeed({ limit = 30, compact = false }: { limit?: number; compact?: boolean }) {
  const { data: items, isLoading } = useActivityFeed(limit);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-8 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <EmptyState icon={Activity} title="No activity yet" description="Actions across the office will show up here." className="py-10" />;
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.entity_type === 'property' ? `/properties/${item.entity_id}` : '#'}
          className="flex gap-3 group"
        >
          <Avatar name={item.agent?.name ?? '?'} color={item.agent?.avatar_color} url={item.agent?.avatar_url} size="sm" />
          <div className="flex-1 min-w-0 pb-3 border-b border-border/60 last:border-0">
            <p className="text-sm leading-snug group-hover:text-primary transition-colors">{item.summary}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(item.created_at)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
