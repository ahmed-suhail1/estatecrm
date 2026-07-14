'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAgentStore } from '@/lib/stores/agent-store';
import { Avatar } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Agent } from '@/types/database';
import { Building2 } from 'lucide-react';
import { toast } from 'sonner';

async function fetchAgents(): Promise<Agent[]> {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export function AgentPicker() {
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const isPickerOpen = useAgentStore((s) => s.isPickerOpen);
  const setAgent = useAgentStore((s) => s.setAgent);
  const closePicker = useAgentStore((s) => s.closePicker);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  });

  // On first load (post-hydration), if no identity is stored, force the picker open.
  const open = hydrated && (isPickerOpen || !currentAgent);

  function handleSelect(agent: Agent) {
    setAgent({
      id: agent.id,
      name: agent.name,
      avatar_color: agent.avatar_color,
      avatar_url: agent.avatar_url,
      role: agent.role,
    });
    toast.success(`Welcome back, ${agent.name.split(' ')[0]}`);
  }

  if (!hydrated) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && currentAgent && closePicker()}>
      <DialogContent
        hideClose={!currentAgent}
        className="max-w-md"
        onEscapeKeyDown={(e) => !currentAgent && e.preventDefault()}
        onInteractOutside={(e) => !currentAgent && e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center mb-2">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold">Who&rsquo;s using EstateCRM?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This device will remember you. Switch anytime from your profile menu.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 py-3">
                <div className="h-14 w-14 rounded-full skeleton" />
                <div className="h-3 w-12 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 mt-4">
            {agents?.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleSelect(agent)}
                className="flex flex-col items-center gap-2 rounded-xl py-3 px-2 transition-colors hover:bg-surface-hover active:scale-[0.97]"
              >
                <Avatar name={agent.name} color={agent.avatar_color} url={agent.avatar_url} size="xl" />
                <span className="text-xs font-medium leading-tight text-center">
                  {agent.name}
                </span>
                {agent.role !== 'agent' && (
                  <span className="text-[10px] text-muted-foreground capitalize -mt-1">
                    {agent.role}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
