import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SearchIndexingService } from '../search/search-indexing.service';
import { TypesenseService } from '../search/typesense.service';
import { SupabaseService } from '../supabase/supabase.service';

const PAGE_SIZE = 500;

async function fetchTableIds(
  supabase: SupabaseService,
  table: 'job_offers' | 'profiles',
): Promise<string[]> {
  const ids: string[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase
      .getClient()
      .from(table)
      .select('id')
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`${table} id fetch failed: ${error.message}`);
    }
    const rows = data ?? [];
    if (rows.length === 0) {
      break;
    }
    for (const row of rows) {
      ids.push(String((row as { id: string }).id));
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
    offset += PAGE_SIZE;
  }
  return ids;
}

async function runInParallelChunks(
  items: string[],
  concurrency: number,
  fn: (id: string) => Promise<void>,
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const results = await Promise.allSettled(slice.map((id) => fn(id)));
    for (const r of results) {
      if (r.status === 'fulfilled') {
        ok += 1;
      } else {
        failed += 1;
        console.error(r.reason);
      }
    }
  }
  return { ok, failed };
}

async function bootstrap(): Promise<void> {
  const jobsOnly = process.argv.includes('--jobs-only');
  const profilesOnly = process.argv.includes('--profiles-only');
  const schoolsOnly = process.argv.includes('--schools-only');
  const flags = [jobsOnly, profilesOnly, schoolsOnly].filter(Boolean).length;
  if (flags > 1) {
    console.error(
      'Use only one of --jobs-only, --profiles-only, or --schools-only.',
    );
    process.exit(1);
  }
  const runJobs = !profilesOnly && !schoolsOnly;
  const runProfiles = !jobsOnly && !schoolsOnly;
  const runSchools = schoolsOnly;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const typesense = app.get(TypesenseService);
    const indexing = app.get(SearchIndexingService);
    const supabase = app.get(SupabaseService);

    if (!typesense.isEnabled()) {
      console.error(
        'Typesense is disabled. Set TYPESENSE_HOST and TYPESENSE_API_KEY in .env',
      );
      process.exitCode = 1;
      return;
    }

    if (runJobs) {
      console.log('Loading job_offer ids…');
      const jobIds = await fetchTableIds(supabase, 'job_offers');
      const conc = Number(process.env.SEARCH_REINDEX_CONCURRENCY || '8') || 8;
      console.log(`Indexing ${jobIds.length} jobs (concurrency ${conc})…`);
      const jobResult = await runInParallelChunks(jobIds, conc, (id) =>
        indexing.indexJobById(id),
      );
      console.log(
        `Jobs done: ${jobResult.ok} ok, ${jobResult.failed} failed (individual errors above).`,
      );
    }

    if (runProfiles) {
      console.log('Loading profile ids…');
      const profileIds = await fetchTableIds(supabase, 'profiles');
      const conc = Number(process.env.SEARCH_REINDEX_CONCURRENCY || '8') || 8;
      console.log(`Indexing ${profileIds.length} profiles (concurrency ${conc})…`);
      const profileResult = await runInParallelChunks(profileIds, conc, (id) =>
        indexing.indexProfileById(id),
      );
      console.log(
        `Profiles done: ${profileResult.ok} ok, ${profileResult.failed} failed.`,
      );
    }

    if (runSchools) {
      console.log('Indexing sk_education_institutions…');
      const count = await indexing.indexAllSkEducationInstitutions();
      console.log(`Schools done: ${count} indexed.`);
    }

    console.log('Typesense reindex finished.');
  } finally {
    await app.close();
  }
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
