/**
 * Triggers a browser download for a remote file. Uses a blob fetch when CORS allows
 * so the suggested filename is applied; falls back to opening the URL if fetch fails.
 */
export async function triggerFileDownload(url: string, fileName: string): Promise<void> {
  const name = fileName.trim() || 'download'
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = name
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  } catch {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = name
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
}
