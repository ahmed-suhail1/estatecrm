import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Agent } from '@/types/database';

// ============================================================================
// Agent Identity — design rationale
// ============================================================================
// Why not real accounts?
//   The office has 5-15 trusted people sharing internal tooling. Per-user
//   auth (passwords, email verification, sessions) is pure overhead here:
//   it adds login friction to a tool people should open and use in seconds,
//   and buys security that isn't needed for an internal, non-public app.
//
// What we do instead: "device-remembered identity"
//   1. On first visit, the browser has no agent_id in localStorage → show
//      a full-screen picker: "Who are you?" with avatars for every agent.
//   2. Selecting an agent persists { id, name, avatar_color } to
//      localStorage. Every subsequent visit on that device auto-resumes
//      as that agent — no login step.
//   3. Every mutation (insert/update) in the app reads the current agent
///     id from this store and stamps created_by / updated_by / agent_id.
//   4. "Switch Agent" in the profile menu clears the stored identity and
//      re-shows the picker — useful for shared office desktops.
//   5. Optional 4-digit PIN: if an agent has pin_hash set, switching to
//      that identity requires the PIN. This is a *soft* deterrent (stops
//      a coworker from accidentally posting as you), not real security —
//      appropriate for a trusted internal tool. It is NOT required by
//      default; office admins can enable it per-agent.
//
// Why this is better than the alternatives:
//   - Real auth: too heavy for a 15-person internal tool, adds a password
//     reset support burden for zero real benefit on a private network.
//   - No identity at all: fails the explicit requirement that every action
//     records who performed it (audit trail, @mentions, "assigned agent").
//   - Cookie/session-based "pick once per session": worse UX — the whole
//     point is agents open the CRM on their own phone/laptop repeatedly
//     and shouldn't have to re-identify each time.
// ============================================================================

interface AgentIdentity {
  id: string;
  name: string;
  avatar_color: string;
  avatar_url: string | null;
  role: Agent['role'];
}

interface AgentStore {
  currentAgent: AgentIdentity | null;
  isPickerOpen: boolean;
  setAgent: (agent: AgentIdentity) => void;
  switchAgent: () => void;
  closePicker: () => void;
  openPicker: () => void;
}

export const useAgentStore = create<AgentStore>()(
  persist(
    (set) => ({
      currentAgent: null,
      isPickerOpen: false,
      setAgent: (agent) => set({ currentAgent: agent, isPickerOpen: false }),
      switchAgent: () => set({ isPickerOpen: true }),
      closePicker: () => set({ isPickerOpen: false }),
      openPicker: () => set({ isPickerOpen: true }),
    }),
    {
      name: 'estatecrm-agent-identity',
      partialize: (state) => ({ currentAgent: state.currentAgent }),
    }
  )
);

/** Convenience accessor for use in non-component code (mutation helpers). */
export function getCurrentAgentId(): string | null {
  return useAgentStore.getState().currentAgent?.id ?? null;
}
