export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function csvEscape(value: unknown): string {
  if (value == null) return '""'
  const s = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${s.replace(/"/g, '""')}"`
}
