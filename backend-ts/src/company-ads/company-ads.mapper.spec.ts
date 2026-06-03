import {
  ownerSnapshotFromProfile,
  resolveOwnerDisplayNameFromProfile,
  type OwnerListRow,
} from './company-ads.mapper';

describe('resolveOwnerDisplayNameFromProfile', () => {
  it('uses first and last name when display_name is empty', () => {
    const owner: OwnerListRow = {
      id: 'u1',
      role: 'individual',
      location: null,
      company_name: null,
      display_name: null,
      first_name: 'Ján',
      last_name: 'Novák',
      logo_url: null,
      avatar_url: null,
      registry_verified_at: null,
    };
    expect(resolveOwnerDisplayNameFromProfile(owner)).toBe('Ján Novák');
  });

  it('falls back to company_name', () => {
    const owner: OwnerListRow = {
      id: 'u1',
      role: 'company',
      location: null,
      company_name: 'Firma s.r.o.',
      display_name: null,
      first_name: null,
      last_name: null,
      logo_url: null,
      avatar_url: null,
      registry_verified_at: null,
    };
    expect(resolveOwnerDisplayNameFromProfile(owner)).toBe('Firma s.r.o.');
  });
});

describe('ownerSnapshotFromProfile', () => {
  it('sets resolved owner_display_name on snapshot', () => {
    const snap = ownerSnapshotFromProfile({
      id: 'u1',
      role: 'individual',
      location: 'Bratislava',
      company_name: null,
      display_name: null,
      first_name: 'Eva',
      last_name: 'Kováčová',
      logo_url: null,
      avatar_url: '/a.png',
      registry_verified_at: null,
    });
    expect(snap.owner_display_name).toBe('Eva Kováčová');
    expect(snap.owner_role).toBe('individual');
  });
});
