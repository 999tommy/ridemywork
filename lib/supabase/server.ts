import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "../../types/database";

export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const cookieStore = cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (updates) => updates.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
}
