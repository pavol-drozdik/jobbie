/** Human-readable device label from a User-Agent string (best-effort). */
export function parseUserAgentLabel(ua: string | null | undefined): string {
  const s = (ua ?? '').trim()
  if (!s) {
    return 'Neznáme zariadenie'
  }
  if (/Codex|Electron/i.test(s)) {
    return 'Codex/Electron'
  }

  let browser = 'Prehliadač'
  if (/Edg\//i.test(s)) {
    browser = 'Edge'
  } else if (/Chrome\//i.test(s) && !/Edg/i.test(s)) {
    browser = 'Chrome'
  } else if (/Firefox\//i.test(s)) {
    browser = 'Firefox'
  } else if (/Safari\//i.test(s) && !/Chrome/i.test(s)) {
    browser = 'Safari'
  } else if (/OPR\//i.test(s)) {
    browser = 'Opera'
  }

  let os = ''
  if (/Windows NT/i.test(s)) {
    os = 'Windows'
  } else if (/Mac OS X/i.test(s)) {
    os = 'macOS'
  } else if (/Android/i.test(s)) {
    os = 'Android'
  } else if (/iPhone|iPad|iPod/i.test(s)) {
    os = 'iOS'
  } else if (/Linux/i.test(s)) {
    os = 'Linux'
  }

  return os ? `${browser} na ${os}` : browser
}
