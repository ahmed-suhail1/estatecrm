'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCurrentAgentId } from '@/lib/stores/agent-store';
import type { Task, Agent, Property, TaskPriority } from '@/types/database';

export interface TaskWithRelations extends Task {
  assigned_agent?: Agent | null;
  property?: Property | null;
}

export function useTasks(filter?: { onlyMine?: boolean; agentId?: string }) {
  return useQuery({
    queryKey: ['tasks', filter],
    queryFn: async (): Promise<TaskWithRelations[]> => {
      let query = supabase
        .from('tasks')
        .select('*, assigned_agent:agents(*), property:properties(*)')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (filter?.onlyMine) {
        const id = getCurrentAgentId();
        if (id) query = query.eq('assigned_agent_id', id);
      } else if (filter?.agentId) {
        query = query.eq('assigned_agent_id', filter.agentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as TaskWithRelations[];
    },
  });
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  property_id?: string;
  owner_id?: string;
  assigned_agent_id?: string;
  due_date?: string;
  priority: TaskPriority;
}

export async function createTask(input: CreateTaskInput) {
  const agentId = getCurrentAgentId();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...input, created_by: agentId })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('activity_feed').insert({
    agent_id: agentId,
    entity_type: 'task',
    entity_id: data.id,
    verb: 'created',
    summary: `New task created: ${input.title}`,
  });

  return data as Task;
}

export async function toggleTaskComplete(id: string, isCompleted: boolean) {
  const { error } = await supabase
    .from('tasks')
    .update({ is_completed: !isCompleted, completed_at: !isCompleted ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
