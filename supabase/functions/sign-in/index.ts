// Username-to-email resolution stays server-side so public profile queries do
// not disclose members' recovery email addresses.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const payload = await request.json().catch(() => null);
  const action = typeof payload?.action === "string" ? payload.action : "sign_in";
  const username = typeof payload?.username === "string" ? payload.username.trim().toLowerCase() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";
  if (action !== "sign_in" && action !== "check_username") return json({ error: "Invalid request" }, 400);
  if (!/^[a-z0-9-]{3,30}$/.test(username) || (action === "sign_in" && (password.length < 8 || password.length > 128))) return json({ error: "Invalid sign-in details" }, 400);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return json({ error: "Sign-in is not configured" }, 503);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  if (action === "check_username") {
    const { data, error } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
    if (error) return json({ error: "Could not check username availability" }, 503);
    return json({ available: !data });
  }
  const { data: profile } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
  if (!profile) return json({ error: "Invalid sign-in details" }, 401);
  const { data: member } = await admin.auth.admin.getUserById(profile.id);
  if (!member.user?.email) return json({ error: "Invalid sign-in details" }, 401);

  const signIn = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await signIn.auth.signInWithPassword({ email: member.user.email, password });
  if (error || !data.session) return json({ error: "Invalid sign-in details" }, 401);
  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
});
