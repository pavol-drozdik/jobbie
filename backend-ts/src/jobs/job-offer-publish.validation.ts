import { BadRequestException } from '@nestjs/common';
import { JOB_CATEGORY_SLUGS } from '../common/job-categories.constants';
import { isApplicationDeadlinePassed } from './job-deadline.util';
import type { JobPublishInput } from './job-offer.constants';

function isRemoteOnly(workModes: string[] | undefined | null): boolean {
  const modes = (workModes ?? []).filter(Boolean);
  return modes.length > 0 && modes.every((m) => m === 'remote');
}

type RequirementsMeta = {
  turnus?: { od?: string | null; do?: string | null };
};

function parseRequirementsMeta(raw: string | null | undefined): RequirementsMeta {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as RequirementsMeta;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function hasCity(input: JobPublishInput): boolean {
  const city = (input.city ?? '').trim();
  if (city.length > 0) return true;
  const loc = (input.location ?? '').trim();
  return loc.length > 0;
}

// NOTE: Draft saves skip validation; publish/activate paths call this with isDraft: false.
export function validateJobForPublish(
  input: JobPublishInput,
  opts: { isDraft: boolean },
): void {
  if (opts.isDraft) return;

  const errors: string[] = [];

  if (!(input.title ?? '').trim()) {
    errors.push('Názov inzerátu je povinný.');
  } else if ((input.title ?? '').trim().length > 120) {
    errors.push('Názov inzerátu môže mať najviac 120 znakov.');
  }
  if (!(input.description ?? '').trim()) {
    errors.push('Popis práce je povinný.');
  }
  const category = (input.category ?? '').trim();
  if (!category) {
    errors.push('Kategória je povinná.');
  } else if (!(JOB_CATEGORY_SLUGS as readonly string[]).includes(category)) {
    errors.push('Neplatná kategória.');
  }
  if (!(input.job_type ?? '').trim()) {
    errors.push('Typ úväzku je povinný.');
  }

  const employment = (input.employment_types ?? []).filter(Boolean);
  if (employment.length === 0) {
    errors.push('Vyberte aspoň jeden typ úväzku.');
  }
  if (employment.includes('turnus')) {
    const turnus = parseRequirementsMeta(input.requirements).turnus;
    if (!(turnus?.od ?? '').trim() || !(turnus?.do ?? '').trim()) {
      errors.push('Pre turnusovú prácu zadajte obdobie od a do.');
    }
  }

  const workModes = (input.work_modes ?? []).filter(Boolean);
  if (workModes.length === 0 && !(input.work_mode ?? '').trim()) {
    errors.push('Vyberte aspoň jednu formu práce.');
  }

  if (!isRemoteOnly(workModes.length ? workModes : input.work_mode ? [input.work_mode] : [])) {
    if (!hasCity(input)) {
      errors.push('Mesto/obec je povinné, ak práca nie je výlučne na diaľku.');
    }
    if (!(input.location_address ?? '').trim()) {
      errors.push('Ulica a číslo sú povinné, ak práca nie je výlučne na diaľku.');
    }
  }

  const negotiable =
    input.salary_negotiable === true || input.salary_type === 'negotiable';
  if (!negotiable) {
    const min =
      input.salary_min !== null && input.salary_min !== undefined
        ? Number(input.salary_min)
        : null;
    if (min === null || !Number.isFinite(min) || min <= 0) {
      if ((input.salary_type ?? '').trim()) {
        errors.push('Zadajte plat od alebo označte plat ako dohodou.');
      }
    }
    const max =
      input.salary_max !== null && input.salary_max !== undefined
        ? Number(input.salary_max)
        : null;
    if (
      min !== null &&
      max !== null &&
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      max < min
    ) {
      errors.push('Plat do musí byť väčší alebo rovný plat od.');
    }
  }

  const method = (input.application_method ?? 'platform').trim();
  if (!method) {
    errors.push('Spôsob prihlásenia je povinný.');
  } else if (method === 'email' && !(input.contact_email ?? '').trim()) {
    errors.push('Kontaktný e-mail je povinný pri prihlásení e-mailom.');
  } else if (method === 'phone' && !(input.contact_phone ?? '').trim()) {
    errors.push('Telefón je povinný pri telefonickom prihlásení.');
  } else if (method === 'external' && !(input.application_url ?? '').trim()) {
    errors.push('Odkaz na prihlásenie je povinný pri externom prihlásení.');
  }

  if (
    input.application_deadline &&
    isApplicationDeadlinePassed(input.application_deadline)
  ) {
    errors.push('Termín prihlášky nemôže byť v minulosti.');
  }

  const wh = input.weekly_hours;
  if (wh !== null && wh !== undefined && Number(wh) <= 0) {
    errors.push('Počet hodín týždenne musí byť kladné číslo.');
  }
  const eh = input.estimated_hours;
  if (eh !== null && eh !== undefined && Number(eh) <= 0) {
    errors.push('Odhadovaný počet hodín musí byť kladné číslo.');
  }
  const wn = input.workers_needed;
  if (wn !== null && wn !== undefined && (!Number.isInteger(Number(wn)) || Number(wn) < 1)) {
    errors.push('Počet voľných miest musí byť aspoň 1.');
  }

  const docs = input.required_documents ?? [];
  if (docs.includes('none') && docs.length > 1) {
    errors.push('Ak nie je potrebné nič, ostatné dokumenty musia byť odznačené.');
  }

  if (errors.length > 0) {
    throw new BadRequestException(errors.join(' '));
  }
}

export function sanitizeRequiredDocuments(docs: string[] | undefined | null): string[] {
  const list = (docs ?? []).filter(Boolean);
  if (list.includes('none')) return ['none'];
  return [...new Set(list)];
}
