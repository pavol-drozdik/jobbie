/** Slovak plural for „kredit“ (count only, includes the number). */
export function creditCountLabel(count: number): string {
  const n = Math.max(0, Math.floor(count))
  if (n === 1) return '1 kredit'
  if (n >= 2 && n <= 4) return `${n} kredity`
  return `${n} kreditov`
}
