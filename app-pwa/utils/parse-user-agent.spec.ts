import { parseUserAgentLabel } from './parse-user-agent'

describe('parseUserAgentLabel', () => {
  it('parses Chrome on Windows', () => {
    expect(
      parseUserAgentLabel(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      ),
    ).toBe('Chrome na Windows')
  })

  it('handles empty UA', () => {
    expect(parseUserAgentLabel(null)).toBe('Neznáme zariadenie')
  })

  it('detects Electron', () => {
    expect(parseUserAgentLabel('Mozilla/5.0 Electron/28.0')).toBe('Codex/Electron')
  })
})
