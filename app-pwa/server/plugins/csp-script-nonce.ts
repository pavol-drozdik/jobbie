import {
  injectScriptNonceIntoHtmlChunk,
  injectScriptNonceIntoRenderContext,
} from '../../utils/csp-script-nonce'

function readCspNonce(event: { context?: { cspNonce?: string } }): string | undefined {
  const nonce = event.context?.cspNonce?.trim()
  return nonce || undefined
}

/**
 * Stamp CSP nonces on inline/module Nuxt bootstrap scripts.
 * `nuxt.config` `render:html` used to call `.replace()` on the whole context object;
 * Nitro passes `{ head, body, bodyPrepend, bodyAppend }` string arrays instead.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    const nonce = readCspNonce(event)
    if (!nonce) return
    if (typeof html === 'string') {
      return injectScriptNonceIntoHtmlChunk(html, nonce)
    }
    injectScriptNonceIntoRenderContext(html, nonce)
  })

  nitroApp.hooks.hook('render:html:close', (ctx, { event }) => {
    const nonce = readCspNonce(event)
    if (!nonce || !Array.isArray(ctx.bodyAppend)) return
    for (let i = 0; i < ctx.bodyAppend.length; i++) {
      const chunk = ctx.bodyAppend[i]
      if (typeof chunk === 'string') {
        ctx.bodyAppend[i] = injectScriptNonceIntoHtmlChunk(chunk, nonce)
      }
    }
  })
})
