/** Match opening `<script` tags that do not already carry a `nonce` attribute. */
const SCRIPT_WITHOUT_NONCE_RE = /<script(?![^>]*\snonce=)/gi

export function injectScriptNonceIntoHtmlChunk(html: string, nonce: string): string {
  if (!html.includes('<script')) {
    return html
  }
  return html.replace(SCRIPT_WITHOUT_NONCE_RE, `<script nonce="${nonce}"`)
}

export type NuxtHtmlChunkContext = {
  head?: string[]
  body?: string[]
  bodyPrepend?: string[]
  bodyAppend?: string[]
}

/** Patch all Nitro `render:html` chunk arrays (Nuxt 3 passes an object, not one string). */
export function injectScriptNonceIntoRenderContext(
  ctx: NuxtHtmlChunkContext,
  nonce: string,
): void {
  for (const key of ['head', 'body', 'bodyPrepend', 'bodyAppend'] as const) {
    const chunks = ctx[key]
    if (!Array.isArray(chunks)) continue
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (typeof chunk === 'string') {
        chunks[i] = injectScriptNonceIntoHtmlChunk(chunk, nonce)
      }
    }
  }
}
