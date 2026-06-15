import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _instance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_instance) {
    _instance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _instance;
}

// Named alias for backwards compatibility across the codebase
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop];
  },
});
