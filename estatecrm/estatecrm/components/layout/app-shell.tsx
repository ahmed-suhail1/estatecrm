'use client';

import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { TopBar } from './top-bar';
import { AgentPicker } from '@/components/agent/agent-picker';
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync';
import { useAgentStore } from '@/lib/stores/agent-store';
import { Toaster } from 'sonner';

export function AppShell({ children }: { children: React.ReactNode }) {
  useRealtimeSync();
  const currentAgent = useAgentStore((s) => s.currentAgent);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 pb-20 md:pb-0">
          {currentAgent ? children : <div className="min-h-[60vh]" />}
        </main>
      </div>
      <MobileNav />
      <AgentPicker />
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
