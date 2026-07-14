'use client';

import { useAgentStore } from '@/lib/stores/agent-store';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Repeat, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/providers/theme-provider';

export function ProfileMenu() {
  const currentAgent = useAgentStore((s) => s.currentAgent);
  const switchAgent = useAgentStore((s) => s.switchAgent);
  const { theme, setTheme } = useTheme();

  if (!currentAgent) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar name={currentAgent.name} color={currentAgent.avatar_color} url={currentAgent.avatar_url} size="md" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2 py-2">
          <Avatar name={currentAgent.name} color={currentAgent.avatar_color} url={currentAgent.avatar_url} size="sm" />
          <div className="flex flex-col">
            <span className="text-foreground text-sm font-medium">{currentAgent.name}</span>
            <span className="text-[11px] capitalize">{currentAgent.role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={switchAgent}>
          <Repeat className="h-4 w-4" />
          Switch Agent
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="pb-1">Theme</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="h-4 w-4" />
          Light {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="h-4 w-4" />
          Dark {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="h-4 w-4" />
          System {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
