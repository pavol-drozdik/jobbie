export type CspViolationSummary = {
  directive: string;
  doc: string;
  blocked: string;
};

function readReportField(
  report: Record<string, unknown>,
  keys: string[],
): string {
  for (const key of keys) {
    const value = report[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

/**
 * Normalizes legacy `csp-report` JSON and newer Reporting API shapes.
 */
export function parseCspReportBody(body: unknown): CspViolationSummary | null {
  if (body == null) {
    return null;
  }
  let raw: unknown = body;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const root = raw as Record<string, unknown>;
  const nested =
    root['csp-report'] && typeof root['csp-report'] === 'object'
      ? (root['csp-report'] as Record<string, unknown>)
      : root.body && typeof root.body === 'object'
        ? (root.body as Record<string, unknown>)
        : root;
  const report =
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>)
      : null;
  if (!report) {
    return null;
  }
  const directive = readReportField(report, [
    'violated-directive',
    'effective-directive',
    'violatedDirective',
    'effectiveDirective',
  ]);
  const doc = readReportField(report, ['document-uri', 'documentURI']);
  const blocked = readReportField(report, ['blocked-uri', 'blockedURI']);
  if (!directive && !doc && !blocked) {
    return null;
  }
  return {
    directive: directive.slice(0, 120),
    doc: doc.slice(0, 200),
    blocked: blocked.slice(0, 200),
  };
}
