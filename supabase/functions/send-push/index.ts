// Called by a Supabase Database Webhook after a public.notifications INSERT.
// Keep this function secret and all service/VAPID keys in Supabase Function Secrets.
import { createClient } from "npm:@supabase/supabase-js@2.118.0";
import webpush from "npm:web-push@3.6.7";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expectedSecret = Deno.env.get("RMW_PUSH_WEBHOOK_SECRET");
  if (!expectedSecret || request.headers.get("x-rmw-push-secret") !== expectedSecret) return json({ error: "Unauthorized" }, 401);

  const event = await request.json().catch(() => null);
  if (event?.type !== "INSERT" || event?.schema !== "public" || event?.table !== "notifications") return json({ skipped: true });
  const record = event.record;
  if (!record?.owner_id || !record?.title || !record?.body) return json({ error: "Notification record is incomplete" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!supabaseUrl || !serviceRoleKey || !publicKey || !privateKey || !subject) return json({ error: "Push sender is not configured" }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  webpush.setVapidDetails(subject, publicKey, privateKey);
  const { data: subscriptions, error } = await admin.from("push_subscriptions").select("id,subscription").eq("owner_id", record.owner_id);
  if (error) return json({ error: "Could not load push subscriptions" }, 500);

  const payload = JSON.stringify({ title: record.title, body: record.body, href: record.href || "/ride/activity" });
  const results = await Promise.allSettled((subscriptions ?? []).map(async (item) => {
    try {
      await webpush.sendNotification(item.subscription, payload, { TTL: 3600 });
    } catch (pushError) {
      const statusCode = (pushError as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) await admin.from("push_subscriptions").delete().eq("id", item.id);
      throw pushError;
    }
  }));
  return json({ sent: results.filter((result) => result.status === "fulfilled").length, expired: (subscriptions?.length ?? 0) - results.filter((result) => result.status === "fulfilled").length });
});
