/**
 * Sentry Internal Integration → Discord bridge (Cloudflare Worker).
 * Deploy: Cloudflare Workers & Pages → Create → paste this file.
 *
 * Secrets (encrypted):
 *   WEBHOOK_SECRET      — random string; also the path segment after /sentry/
 *   DISCORD_WEBHOOK_URL — #bugs-prod Discord webhook
 *
 * Sentry Internal Integration webhook URL:
 *   https://YOUR-WORKER.example.workers.dev/sentry/YOUR_WEBHOOK_SECRET
 *
 * Do NOT use ?secret= query auth (returns 401 with path-based check).
 * Do NOT use legacy Sentry Webhooks plugin on SaaS.
 */

const LEVEL_EMOJI = {
  fatal: '🔴',
  error: '🟠',
  warning: '🟡',
  info: '🔵',
  debug: '⚪',
};

const PROJECT_LABELS = {
  'backend-ts': 'backend-ts',
  'app-pwa': 'app-pwa',
};

function tagValue(tags, key) {
  if (!Array.isArray(tags)) return undefined;
  const hit = tags.find(([k]) => k === key);
  return hit?.[1];
}

function resolveEnvironment(payload) {
  const data = payload?.data ?? {};
  const issue = data.issue ?? {};
  const event = data.event ?? {};
  return (
    event.environment ||
    tagValue(event.tags, 'environment') ||
    issue.environment ||
    data.environment ||
    'unknown'
  );
}

function resolveProjectSlug(payload) {
  const data = payload?.data ?? {};
  return (
    data.project?.slug ||
    data.event?.project ||
    data.issue?.project?.slug ||
    'unknown'
  );
}

function formatDiscordMessage(payload) {
  const data = payload?.data ?? {};
  const issue = data.issue ?? {};
  const event = data.event ?? {};
  const projectSlug = resolveProjectSlug(payload);
  const project = PROJECT_LABELS[projectSlug] || projectSlug;
  const env = resolveEnvironment(payload);
  const level = (event.level || issue.level || 'error').toLowerCase();
  const emoji = LEVEL_EMOJI[level] || '⚪';
  const title = issue.title || issue.culprit || 'Sentry alert';
  const url = issue.permalink || issue.web_url || data.web_url || '';
  const culprit = event.culprit || issue.culprit || '';
  const action = payload?.action || '';
  const isNew = action === 'created' || issue.substatus === 'new';
  const isRegressed = action === 'regressed' || issue.substatus === 'regressed';
  const flags = [isNew && '🆕 new', isRegressed && '↩️ regressed'].filter(Boolean).join(' ');

  const lines = [
    `${emoji} **${project}** · \`${env}\`${flags ? ` · ${flags}` : ''}`,
    `**${title}**`,
    culprit ? `\`${culprit}\`` : null,
    url ? `[Open in Sentry](${url})` : null,
  ].filter(Boolean);

  return { content: lines.join('\n') };
}

function authorize(request, env) {
  const url = new URL(request.url);
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] === 'sentry' && parts[1] && parts[1] === env.WEBHOOK_SECRET) {
    return true;
  }
  return false;
}

async function postToDiscord(env, body) {
  const res = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord ${res.status}: ${text}`);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }
    if (!authorize(request, env)) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (!env.DISCORD_WEBHOOK_URL) {
      return new Response('DISCORD_WEBHOOK_URL not set', { status: 500 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    const discordBody = formatDiscordMessage(payload);
    ctx.waitUntil(
      postToDiscord(env, discordBody).catch((err) => console.error('Discord failed', err)),
    );

    return new Response('ok', { status: 200 });
  },
};
