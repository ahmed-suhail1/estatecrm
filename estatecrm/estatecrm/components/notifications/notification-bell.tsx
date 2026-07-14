'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAgentStore } from '@/lib/stores/agent-store';
import { Bell, CircleDollarSign, AtSign, CheckSquare, Home, TrendingUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatRelativeTime, cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import type { Notification, NotificationType } from '@/types/database';
import Link from 'next/link';

const ICONS: Record<NotificationType, typeof Bell> = {
  new_property: Home,
  price_change: TrendingUp,
  mention: AtSign,
  task_assigned: CheckSquare,
  property_sold: CircleDollarSign,
  status_change: Home,
  task_due_soon: CheckSquare,
};

async function fetchNotifications(agentId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_agent_id', agentId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data;
}

export function NotificationBell() {
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ['notifications', currentAgent?.id],
    queryFn: () => fetchNotifications(currentAgent!.id),
    enabled: !!currentAgent,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length ?? 0;

  async function markAllRead() {
    if (!currentAgent) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('recipient_agent_id', currentAgent.id)
      .eq('is_read', false);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }

  if (!currentAgent) return null;

  return (
    <Popover onOpenChange={(open) => open && unreadCount > 0 && markAllRead()}>
      <PopoverTrigger className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {!notifications || notifications.length === 0 ? (
            <EmptyState icon={Bell} title="No notifications yet" className="py-10" />
          ) : (
            notifications.map((n) => {
              const Icon = ICONS[n.type];
              const href =
                n.entity_type === 'property' ? `/properties/${n.entity_id}` :
                n.entity_type === 'task' ? '/tasks' : '#';
              return (
                <Link
                  href={href}
                  key={n.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-surface-hover transition-colors',
                    !n.is_read && 'bg-primary/5'
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
