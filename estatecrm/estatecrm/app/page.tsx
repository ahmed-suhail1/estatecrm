'use client';

import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats';
import { StatCard } from '@/components/dashboard/stat-card';
import { ActivityFeed } from '@/components/activity/activity-feed';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/lib/stores/agent-store';
import { useTasks } from '@/lib/hooks/use-tasks';
import { useFavorites } from '@/lib/hooks/use-favorites';
import { useRecentlyViewed } from '@/lib/hooks/use-recently-viewed';
import { useAllProperties } from '@/lib/hooks/use-property-search';
import { PropertyRow } from '@/components/properties/property-row';
import { TaskRow } from '@/components/tasks/task-row';
import {
  Building2, Sparkles, CircleDollarSign, KeyRound, CheckSquare, Plus, Star, Clock,
} from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { useMemo } from 'react';

export default function DashboardPage() {
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: allTasks } = useTasks({ onlyMine: true });
  const { data: favoriteIds } = useFavorites();
  const { data: allProperties } = useAllProperties();
  const { data: recentlyViewed } = useRecentlyViewed(5);

  const tasksDueToday = useMemo(() => {
    if (!allTasks) return [];
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return allTasks.filter((t) => !t.is_completed && t.due_date && new Date(t.due_date) <= end).slice(0, 5);
  }, [allTasks]);

  const favoriteProperties = useMemo(() => {
    if (!allProperties || !favoriteIds) return [];
    const set = new Set(favoriteIds);
    return allProperties.filter((p) => set.has(p.id)).slice(0, 5);
  }, [allProperties, favoriteIds]);

  if (!currentAgent) return null;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">
            Welcome back, {currentAgent.name.split(' ')[0]}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here&rsquo;s what&rsquo;s happening in the office.</p>
        </div>
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Property</span>
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Listings" value={stats?.totalListings ?? 0} icon={Building2} loading={statsLoading} color="#6366f1" />
        <StatCard label="New Today" value={stats?.newToday ?? 0} icon={Sparkles} loading={statsLoading} color="#8b5cf6" />
        <StatCard label="Sold" value={stats?.sold ?? 0} icon={CircleDollarSign} loading={statsLoading} color="#10b981" />
        <StatCard label="Rentals" value={stats?.rentals ?? 0} icon={KeyRound} loading={statsLoading} color="#06b6d4" />
        <StatCard label="Tasks Due Today" value={stats?.tasksDueToday ?? 0} icon={CheckSquare} loading={statsLoading} color="#f59e0b" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-muted-foreground" /> Your tasks due today
              </h2>
              <Link href="/tasks" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {tasksDueToday.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Nothing due today" description="You're all caught up." className="py-8" />
            ) : (
              <div className="space-y-1">
                {tasksDueToday.map((task) => <TaskRow key={task.id} task={task} />)}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-muted-foreground" /> Favorite properties
            </h2>
            {favoriteProperties.length === 0 ? (
              <EmptyState icon={Star} title="No favorites yet" description="Star properties to keep them handy here." className="py-8" />
            ) : (
              <div className="space-y-1">
                {favoriteProperties.map((p) => <PropertyRow key={p.id} property={p} />)}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recently viewed
            </h2>
            {!recentlyViewed || recentlyViewed.length === 0 ? (
              <EmptyState icon={Clock} title="Nothing viewed yet" className="py-8" />
            ) : (
              <div className="space-y-1">
                {recentlyViewed.map((p) => <PropertyRow key={p.id} property={p} />)}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card className="p-5 sticky top-20">
            <h2 className="text-sm font-semibold mb-4">Office Activity</h2>
            <ActivityFeed limit={20} compact />
          </Card>
        </div>
      </div>
    </div>
  );
}
