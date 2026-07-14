'use client';

import { useMemo, useState } from 'react';
import { useTasks } from '@/lib/hooks/use-tasks';
import { TaskRow } from '@/components/tasks/task-row';
import { NewTaskDialog } from '@/components/tasks/new-task-dialog';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { CheckSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function TasksPage() {
  const { data: tasks, isLoading } = useTasks();
  const [tab, setTab] = useState<'mine' | 'completed'>('mine');

  const filtered = useMemo(() => {
    if (!tasks) return [];
    if (tab === 'completed') return tasks.filter((t) => t.is_completed);
    return tasks.filter((t) => !t.is_completed);
  }, [tasks, tab]);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Follow-ups and reminders for the team</p>
        </div>
        <NewTaskDialog />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="mine">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={CheckSquare} title="No tasks here" description="Create a task to follow up on a lead or listing." className="py-10" />
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </Card>
    </div>
  );
}
