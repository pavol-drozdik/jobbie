import { normalizeSearchText } from '../common/text-normalize.util';
import type { SkSchoolLevelDto, SkSchoolResponseDto } from '../locations/locations.dto';

export type SkSchoolTypesenseDoc = {
  id: string;
  name: string;
  name_normalized: string;
  level: SkSchoolLevelDto;
  country: 'SK' | 'CZ';
  municipality?: string;
  sort_id: number;
};

export function buildSkSchoolsFilterBy(level: SkSchoolLevelDto): string {
  if (level === 'secondary') {
    return 'level:=secondary && country:=SK';
  }
  return 'level:=university && country:[SK,CZ]';
}

export function toSkSchoolTypesenseDoc(row: {
  id: number;
  name: string;
  level: string;
  country: string;
  municipality: string | null;
}): SkSchoolTypesenseDoc {
  const level: SkSchoolLevelDto =
    row.level === 'secondary' ? 'secondary' : 'university';
  const country: 'SK' | 'CZ' = row.country === 'CZ' ? 'CZ' : 'SK';
  const name = String(row.name ?? '').trim();
  return {
    id: String(row.id),
    name,
    name_normalized: normalizeSearchText(name),
    level,
    country,
    municipality: row.municipality?.trim() || undefined,
    sort_id: Number(row.id),
  };
}

export function mapTypesenseDocToSkSchoolResponse(
  doc: Record<string, unknown>,
): SkSchoolResponseDto | null {
  const id = Number(doc.id);
  const name = String(doc.name ?? '').trim();
  if (!Number.isFinite(id) || id <= 0 || !name) {
    return null;
  }
  const levelRaw = String(doc.level ?? '');
  const level: SkSchoolLevelDto =
    levelRaw === 'secondary' ? 'secondary' : 'university';
  const country: 'SK' | 'CZ' =
    String(doc.country ?? '') === 'CZ' ? 'CZ' : 'SK';
  const municipalityRaw = doc.municipality;
  const municipality =
    typeof municipalityRaw === 'string' && municipalityRaw.trim()
      ? municipalityRaw.trim()
      : null;
  return { id, name, level, country, municipality };
}
