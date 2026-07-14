'use client';

import { CommandPalette } from '@/components/search/command-palette';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ProfileMenu } from '@/components/agent/profile-menu';
import { useAgentStore } from '@/lib/stores/agent-store';

export function TopBar() {
  const currentAgent = useAgentStore((s) => s.currentAgent);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-lg px-4 md:px-6">
      <div className="flex md:hidden items-center gap-2 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm">
          E
        </div>
      </div>
      <div className="flex-1 flex justify-center md:justify-start max-w-2xl">
        <CommandPalette />
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {currentAgent && (
          <>
            <NotificationBell />
            <ProfileMenu />
          </>
        )}
      </div>
    </header>
  );
}
