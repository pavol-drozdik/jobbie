/** Triggers a browser download for an in-memory blob. */
export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const name = fileName.trim() || 'download.pdf'
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = name
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}
