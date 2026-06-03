import {

  getJobCategoryLabel,

  JOB_CATEGORY_LABELS,

  JOB_CATEGORY_SLUGS,

  LEGACY_JOB_CATEGORY_SLUG_ALIASES,

  normalizeJobCategorySlug,

} from './job-categories.constants';



describe('job-categories.constants', () => {

  it('defines exactly 10 industry slugs', () => {

    expect(JOB_CATEGORY_SLUGS).toHaveLength(10);

  });



  it('has a Slovak label for every slug', () => {

    for (const slug of JOB_CATEGORY_SLUGS) {

      expect(JOB_CATEGORY_LABELS[slug]).toBeTruthy();

      expect(getJobCategoryLabel(slug)).toBe(JOB_CATEGORY_LABELS[slug]);

    }

  });



  it('falls back to raw slug for unknown values', () => {

    expect(getJobCategoryLabel('legacy_slug')).toBe('legacy_slug');

  });



  it.each(

    Object.entries(LEGACY_JOB_CATEGORY_SLUG_ALIASES) as [

      string,

      (typeof JOB_CATEGORY_SLUGS)[number],

    ][],

  )('normalizes legacy slug %s to %s', (legacy, canonical) => {

    expect(normalizeJobCategorySlug(legacy)).toBe(canonical);

    expect(getJobCategoryLabel(legacy)).toBe(JOB_CATEGORY_LABELS[canonical]);

  });

});


