'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  CheckSquare,
  Map as MapIcon,
  Star,
  Activity,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAgentStore } from '@/lib/stores/agent-store';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/map', label: 'Map', icon: MapIcon },
  { href: '/owners', label: 'Owners', icon: Users },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/favorites', label: 'Favorites', icon: Star },
  { href: '/activity', label: 'Activity', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const currentAgent = useAgentStore((s) => s.currentAgent);

  const { data: taskCount } = useQuery({
    queryKey: ['tasks-due-today-count', currentAgent?.id],
    queryFn: async () => {
      if (!currentAgent) return 0;
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_agent_id', currentAgent.id)
        .eq('is_completed', false)
        .lte('due_date', end.toISOString());
      return count ?? 0;
    },
    enabled: !!currentAgent,
  });

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-surface/50 h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 h-16 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
          E
        </div>
        <span className="font-semibold text-[15px]">EstateCRM</span>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-2.5">
                <item.icon className="h-4 w-4" strokeWidth={2} />
                {item.label}
              </span>
              {item.href === '/tasks' && !!taskCount && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {taskCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}
