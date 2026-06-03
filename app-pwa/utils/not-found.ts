/** Navigate to the global error page with HTTP 404 semantics. */
export function showNotFound(message?: string): void {
  showError({
    statusCode: 404,
    message,
    fatal: true,
  })
}

export function isNotFoundError(error: { statusCode?: number } | null | undefined): boolean {
  return error?.statusCode === 404
}
