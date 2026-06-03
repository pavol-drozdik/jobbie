import { isRpoSearchResultActive, normalizeSkIco } from './sk-rpo-ico.util';

export interface SkCompanySearchResult {
  id: number;
  name: string;
  ico: string | null;
  municipality: string | null;
}

type DatedValueRow = {
  value?: unknown;
  validFrom?: unknown;
  validTo?: unknown;
};

type AddressRow = {
  validFrom?: unknown;
  validTo?: unknown;
  municipality?: { value?: unknown };
};

function pickCurrentDatedValue(items: unknown): string | null {
  if (!Array.isArray(items) || items.length === 0) return null;
  const rows = items
    .filter((x): x is DatedValueRow => Boolean(x) && typeof x === 'object')
    .map((x) => ({
      value: typeof x.value === 'string' ? x.value.trim() : '',
      validFrom: typeof x.validFrom === 'string' ? x.validFrom : '',
      validTo: typeof x.validTo === 'string' ? x.validTo : null,
    }))
    .filter((x) => x.value.length > 0);
  if (rows.length === 0) return null;
  const active = rows.filter((r) => !r.validTo);
  const pool = active.length > 0 ? active : rows;
  pool.sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  return pool[0]?.value ?? null;
}

function pickCurrentMunicipality(addresses: unknown): string | null {
  if (!Array.isArray(addresses) || addresses.length === 0) return null;
  const rows = addresses
    .filter((x): x is AddressRow => Boolean(x) && typeof x === 'object')
    .map((x) => ({
      value:
        typeof x.municipality?.value === 'string'
          ? x.municipality.value.trim()
          : '',
      validFrom: typeof x.validFrom === 'string' ? x.validFrom : '',
      validTo: typeof x.validTo === 'string' ? x.validTo : null,
    }))
    .filter((x) => x.value.length > 0);
  if (rows.length === 0) return null;
  const active = rows.filter((r) => !r.validTo);
  const pool = active.length > 0 ? active : rows;
  pool.sort((a, b) => b.validFrom.localeCompare(a.validFrom));
  return pool[0]?.value ?? null;
}

export function mapRpoSearchRowToCompany(
  row: Record<string, unknown>,
): SkCompanySearchResult | null {
  if (!isRpoSearchResultActive(row)) return null;
  const id = Number(row.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const name = pickCurrentDatedValue(row.fullNames);
  if (!name) return null;
  const rawIco = pickCurrentDatedValue(row.identifiers);
  const icoNorm = rawIco ? normalizeSkIco(rawIco) : '';
  const ico = icoNorm.length === 8 ? icoNorm : null;
  const municipality = pickCurrentMunicipality(row.addresses);
  return { id, name, ico, municipality };
}

export function parseRpoCompanySearchResponse(
  json: unknown,
  limit: number,
): SkCompanySearchResult[] {
  if (!json || typeof json !== 'object') return [];
  const results = (json as Record<string, unknown>).results;
  if (!Array.isArray(results)) return [];
  const cap = Math.min(80, Math.max(1, limit));
  const seenIco = new Set<string>();
  const seenName = new Set<string>();
  const out: SkCompanySearchResult[] = [];
  for (const item of results) {
    if (!item || typeof item !== 'object') continue;
    const mapped = mapRpoSearchRowToCompany(item as Record<string, unknown>);
    if (!mapped) continue;
    const nameKey = mapped.name.trim().toLocaleLowerCase('sk-SK');
    if (mapped.ico) {
      if (seenIco.has(mapped.ico)) continue;
      seenIco.add(mapped.ico);
    } else if (seenName.has(nameKey)) {
      continue;
    } else {
      seenName.add(nameKey);
    }
    out.push(mapped);
    if (out.length >= cap) break;
  }
  return out;
}
