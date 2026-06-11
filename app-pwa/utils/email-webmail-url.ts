const WEBMAIL_BY_DOMAIN: Record<string, string> = {
  'gmail.com': 'https://mail.google.com',
  'googlemail.com': 'https://mail.google.com',
  'outlook.com': 'https://outlook.live.com/mail/',
  'hotmail.com': 'https://outlook.live.com/mail/',
  'live.com': 'https://outlook.live.com/mail/',
  'msn.com': 'https://outlook.live.com/mail/',
  'yahoo.com': 'https://mail.yahoo.com',
  'yahoo.co.uk': 'https://mail.yahoo.com',
  'icloud.com': 'https://www.icloud.com/mail',
  'me.com': 'https://www.icloud.com/mail',
  'mac.com': 'https://www.icloud.com/mail',
  'proton.me': 'https://mail.proton.me',
  'protonmail.com': 'https://mail.proton.me',
  'seznam.cz': 'https://email.seznam.cz',
  'email.cz': 'https://email.seznam.cz',
  'post.cz': 'https://email.seznam.cz',
  'centrum.sk': 'https://mail.centrum.sk',
  'azet.sk': 'https://mail.azet.sk',
  'zoznam.sk': 'https://mail.zoznam.sk',
  'atlas.sk': 'https://mail.atlas.sk',
  'pobox.sk': 'https://mail.zoznam.sk',
}

/** Returns a webmail URL for common providers, or null when unknown. */
export function resolveWebmailUrl(email: string): string | null {
  const at = email.lastIndexOf('@')
  if (at < 0) {
    return null
  }
  const domain = email.slice(at + 1).trim().toLowerCase()
  if (!domain) {
    return null
  }
  return WEBMAIL_BY_DOMAIN[domain] ?? null
}
