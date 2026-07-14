'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/lib/providers/theme-provider';
import { useAgentStore } from '@/lib/stores/agent-store';
import type { Agent } from '@/types/database';
import { Sun, Moon, Monitor, Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16'];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const switchAgent = useAgentStore((s) => s.switchAgent);
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data } = await supabase.from('agents').select('*').order('name');
      return (data ?? []) as Agent[];
    },
  });

  const addAgent = useMutation({
    mutationFn: async () => {
      const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const { error } = await supabase.from('agents').insert({ name: newName.trim(), avatar_color: color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      setNewName('');
      toast.success('Agent added');
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('agents').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  });

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your workspace and identity</p>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Your Identity</h2>
        {currentAgent && (
          <div className="flex items-center gap-3">
            <Avatar name={currentAgent.name} color={currentAgent.avatar_color} url={currentAgent.avatar_url} size="lg" />
            <div className="flex-1">
              <p className="text-sm font-medium">{currentAgent.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{currentAgent.role}</p>
            </div>
            <Button variant="outline" size="sm" onClick={switchAgent}>
              <Repeat className="h-3.5 w-3.5" /> Switch
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Appearance</h2>
        <div className="flex gap-2">
          {[
            { value: 'light', icon: Sun, label: 'Light' },
            { value: 'dark', icon: Moon, label: 'Dark' },
            { value: 'system', icon: Monitor, label: 'System' },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value as 'light' | 'dark' | 'system')}
              className={`flex-1 flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                theme === opt.value ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:bg-surface-hover'
              }`}
            >
              <opt.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Office Roster</h2>
        <div className="space-y-1 mb-4">
          {agents?.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 py-2">
              <Avatar name={agent.name} color={agent.avatar_color} url={agent.avatar_url} size="sm" />
              <span className="flex-1 text-sm font-medium">{agent.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{agent.role}</span>
              <Switch checked={agent.is_active} onCheckedChange={() => toggleActive.mutate({ id: agent.id, isActive: agent.is_active })} />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-3 border-t border-border">
          <Input placeholder="New agent name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <Button disabled={!newName.trim()} loading={addAgent.isPending} onClick={() => addAgent.mutate()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </Card>
    </div>
  );
}
