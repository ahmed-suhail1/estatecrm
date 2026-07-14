import { createBrowserClient } from '@supabase/ssr';

/**
 * Single shared browser client. We don't use Supabase Auth (see agent
 * identity system), so this is a plain anon-key client — RLS policies
 * are permissive-by-design for this trusted internal tool (see migration
 * 0003 for the reasoning).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Convenience singleton for client components that don't need a fresh
// instance per render.
export const supabase = createClient();
