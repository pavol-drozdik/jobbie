import { describe, expect, it } from 'vitest'
import {
  injectScriptNonceIntoHtmlChunk,
  injectScriptNonceIntoRenderContext,
} from './csp-script-nonce'

describe('injectScriptNonceIntoHtmlChunk', () => {
  it('adds nonce to inline and module scripts without one', () => {
    const html =
      '<script type="module" src="/_nuxt/entry.js"></script>' +
      '<script type="application/json" id="__NUXT_DATA__">{}</script>'
    const out = injectScriptNonceIntoHtmlChunk(html, 'abc123')
    expect(out).toContain('<script nonce="abc123" type="module"')
    expect(out).toContain('<script nonce="abc123" type="application/json"')
  })

  it('does not duplicate nonce attributes', () => {
    const html = '<script nonce="existing" type="module" src="/a.js"></script>'
    expect(injectScriptNonceIntoHtmlChunk(html, 'new')).toBe(html)
  })
})

describe('injectScriptNonceIntoRenderContext', () => {
  it('patches all render:html chunk arrays', () => {
    const ctx = {
      head: ['<script>head</script>'],
      bodyPrepend: ['<script>prepend</script>'],
      body: ['<div>content</div>'],
      bodyAppend: ['<script>append</script>'],
    }
    injectScriptNonceIntoRenderContext(ctx, 'n1')
    expect(ctx.head[0]).toBe('<script nonce="n1">head</script>')
    expect(ctx.bodyPrepend[0]).toBe('<script nonce="n1">prepend</script>')
    expect(ctx.body[0]).toBe('<div>content</div>')
    expect(ctx.bodyAppend[0]).toBe('<script nonce="n1">append</script>')
  })
})
