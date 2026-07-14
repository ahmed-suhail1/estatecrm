'use client';

import { usePropertyEvents } from '@/lib/hooks/use-property-detail';
import { Avatar } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/utils';
import {
  Plus, DollarSign, RefreshCw, Pencil, Images, MessageSquare, UserCog, Tag, History,
} from 'lucide-react';
import type { PropertyEventType } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

const EVENT_ICONS: Record<PropertyEventType, typeof Plus> = {
  created: Plus,
  price_changed: DollarSign,
  status_changed: RefreshCw,
  field_updated: Pencil,
  photos_added: Images,
  photos_removed: Images,
  note_added: MessageSquare,
  agent_changed: UserCog,
  tag_added: Tag,
  tag_removed: Tag,
  restored_version: History,
};

export function PropertyTimeline({ propertyId }: { propertyId: string }) {
  const { data: events, isLoading } = usePropertyEvents(propertyId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-10 flex-1" />
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return <EmptyState icon={History} title="No activity yet" className="py-8" />;
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />
      <div className="space-y-5">
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.event_type] ?? History;
          return (
            <div key={event.id} className="relative flex gap-3">
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface border border-border">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 pt-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {event.agent && (
                    <Avatar name={event.agent.name} color={event.agent.avatar_color} url={event.agent.avatar_url} size="xs" />
                  )}
                  <span className="text-sm">
                    <span className="font-medium">{event.agent?.name ?? 'System'}</span>{' '}
                    <span className="text-muted-foreground">{event.summary}</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{formatRelativeTime(event.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
