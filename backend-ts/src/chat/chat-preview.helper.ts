/**
 * Builds a short inbox preview from decrypted chat message `content` (JSON envelope or legacy plain text).
 */
export function previewFromMessageContent(decryptedContent: string): string {
  const raw = (decryptedContent ?? '').trim();
  if (!raw.startsWith('{')) {
    const t = raw.slice(0, 120);
    return t.length < raw.length ? `${t}…` : t;
  }
  try {
    const o = JSON.parse(raw) as {
      v?: number;
      kind?: string;
      text?: string;
      original_name?: string;
    };
    if (o.kind === 'text' && typeof o.text === 'string') {
      const s = o.text.trim();
      const t = s.slice(0, 120);
      return s.length > 120 ? `${t}…` : t;
    }
    if (o.kind === 'image') {
      return '[Fotka]';
    }
    if (o.kind === 'file') {
      return '[Príloha]';
    }
  } catch {
    /* ignore */
  }
  return '[Správa]';
}
