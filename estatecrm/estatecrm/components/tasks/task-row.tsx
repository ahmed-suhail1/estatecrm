'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleTaskComplete, type TaskWithRelations } from '@/lib/hooks/use-tasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TASK_PRIORITY_META } from '@/types/database';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { Calendar } from 'lucide-react';

export function TaskRow({ task }: { task: TaskWithRelations }) {
  const queryClient = useQueryClient();
  const priorityMeta = TASK_PRIORITY_META[task.priority];
  const isOverdue = task.due_date && !task.is_completed && new Date(task.due_date) < new Date(new Date().setHours(0,0,0,0));

  const mutation = useMutation({
    mutationFn: () => toggleTaskComplete(task.id, task.is_completed),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-due-today-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  return (
    <div className="flex items-center gap-3 rounded-xl p-2.5 -mx-2.5 hover:bg-surface-hover transition-colors group">
      <Checkbox checked={task.is_completed} onCheckedChange={() => mutation.mutate()} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium truncate', task.is_completed && 'line-through text-muted-foreground')}>
          {task.property ? (
            <Link href={`/properties/${task.property.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
              {task.title}
            </Link>
          ) : (
            task.title
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.due_date && (
            <span className={cn('flex items-center gap-1 text-xs', isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
              <Calendar className="h-3 w-3" />
              {formatDate(task.due_date)}
            </span>
          )}
          <Badge color={priorityMeta.color} bg={`${priorityMeta.color}18`}>{priorityMeta.label}</Badge>
        </div>
      </div>
      {task.assigned_agent && (
        <Avatar name={task.assigned_agent.name} color={task.assigned_agent.avatar_color} url={task.assigned_agent.avatar_url} size="sm" />
      )}
    </div>
  );
}
