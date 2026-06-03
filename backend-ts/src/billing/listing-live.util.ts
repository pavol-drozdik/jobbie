/** Matches public catalog SQL: `is_active` and `is_draft is not true`. */
export function isJobListingLiveForTop(row: {
  is_draft?: boolean | null;
  is_active?: boolean | null;
}): boolean {
  return row.is_active === true && row.is_draft !== true;
}

export function isCompanyAdLiveForTop(status: string | null | undefined): boolean {
  return status === 'active';
}
