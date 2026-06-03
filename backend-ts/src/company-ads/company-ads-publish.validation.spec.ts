import { BadRequestException } from '@nestjs/common';
import {
  publishCostCredits,
  resolvePublishMonths,
  validateCompanyAdForPublish,
} from './company-ads-publish.validation';

describe('company-ads-publish.validation', () => {
  const validBase = {
    title: 'Stavebná firma Novák',
    body: 'Popis firmy s dostatočnou dĺžkou textu.',
    category: 'stavba',
    profile_type: 'company',
    services: [],
    region: 'Bratislavský kraj',
    city: 'Bratislava',
    service_areas: ['local_city'],
    price_type: 'negotiable',
    price_negotiable: true,
    preferred_contact_method: 'platform',
  };

  it('requires title for publish', () => {
    expect(() =>
      validateCompanyAdForPublish({ ...validBase, title: '' }, {}),
    ).toThrow(BadRequestException);
  });

  it('skips city/region when online only', () => {
    expect(() =>
      validateCompanyAdForPublish(
        {
          ...validBase,
          region: null,
          city: null,
          service_areas: ['online'],
        },
        {},
      ),
    ).not.toThrow();
  });

  it('requires city and region when not online', () => {
    expect(() =>
      validateCompanyAdForPublish(
        { ...validBase, city: null, service_areas: ['local_city'] },
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it('validates price max >= min', () => {
    expect(() =>
      validateCompanyAdForPublish(
        { ...validBase, price_type: 'hourly', price_negotiable: false, price_min: 50, price_max: 10 },
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it('requires email when preferred contact is email', () => {
    expect(() =>
      validateCompanyAdForPublish(
        { ...validBase, preferred_contact_method: 'email', contact_email: '' },
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it('requires phone when preferred contact is phone', () => {
    expect(() =>
      validateCompanyAdForPublish(
        { ...validBase, preferred_contact_method: 'phone', contact_phone: '' },
        {},
      ),
    ).toThrow(BadRequestException);
  });

  it('resolvePublishMonths clamps to 1-12', () => {
    expect(resolvePublishMonths(undefined)).toBe(1);
    expect(resolvePublishMonths(0)).toBe(1);
    expect(resolvePublishMonths(3)).toBe(3);
    expect(resolvePublishMonths(99)).toBe(12);
  });

  it('publishCostCredits is 3 per month', () => {
    expect(publishCostCredits(1)).toBe(3);
    expect(publishCostCredits(3)).toBe(9);
  });
});

