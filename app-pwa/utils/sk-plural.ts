/** Slovak plural word for „kredit“ (no number). */
export function creditWordLabel(count: number): string {
  const n = Math.max(0, Math.floor(count))
  if (n === 1) return 'kredit'
  if (n >= 2 && n <= 4) return 'kredity'
  return 'kreditov'
}

/** Slovak plural for „kredit“ (count + word). */
export function creditCountLabel(count: number): string {
  const n = Math.max(0, Math.floor(count))
  return `${n} ${creditWordLabel(n)}`
}
