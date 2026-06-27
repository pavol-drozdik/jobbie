/**
 * Supabase Edge Function: discord-content-report
 * Deploy via Dashboard (Edge Functions → Editor) or CLI with --no-verify-jwt.
 *
 * Secret: DISCORD_MODERATION_WEBHOOK_URL (#moderation Discord webhook)
 *
 * Database webhook: public.content_reports → INSERT → this function
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const DISCORD_URL = Deno.env.get("DISCORD_MODERATION_WEBHOOK_URL");

const TARGET_LABELS: Record<string, string> = {
  job_offer: "Job offer",
  company_profile: "Company profile",
  company_ad: "Company ad",
  banner_ad: "Banner ad",
  company_review: "Company review",
  chat_message: "Chat message",
};

function extractRecord(payload: Record<string, unknown>) {
  if (payload.record && typeof payload.record === "object") {
    return payload.record as Record<string, unknown>;
  }
  if (payload.type === "INSERT" && payload.new && typeof payload.new === "object") {
    return payload.new as Record<string, unknown>;
  }
  return payload;
}

Deno.serve(async (req) => {
  if (!DISCORD_URL) {
    return new Response("DISCORD_MODERATION_WEBHOOK_URL not set", { status: 500 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const record = extractRecord(payload);
  const id = String(record.id ?? "—");
  const targetType = String(record.target_type ?? "unknown");
  const targetId = String(record.target_id ?? "—");
  const reason = String(record.reason ?? "").slice(0, 500);
  const label = TARGET_LABELS[targetType] ?? targetType;

  const content = [
    "🚩 **New content report**",
    `**Type:** ${label}`,
    `**Target ID:** \`${targetId}\``,
    `**Report ID:** \`${id}\``,
    reason ? `**Reason:** ${reason}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const discordRes = await fetch(DISCORD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!discordRes.ok) {
    const text = await discordRes.text();
    console.error("Discord error", discordRes.status, text);
    return new Response(`Discord ${discordRes.status}`, { status: 502 });
  }

  return new Response("ok", { status: 200 });
});
