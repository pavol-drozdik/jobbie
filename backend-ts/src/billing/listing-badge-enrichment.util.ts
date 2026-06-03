export function attachShowTopBadgeToJobs<T extends { id: string }>(
  jobs: T[],
  topJobIds: Set<string>,
): (T & { show_top_badge: boolean })[] {
  return jobs.map((job) => ({
    ...job,
    show_top_badge: topJobIds.has(job.id),
  }));
}

export function attachShowTopBadgeToAds<T extends { id: string }>(
  ads: T[],
  topAdIds: Set<string>,
): (T & { show_top_badge: boolean })[] {
  return ads.map((ad) => ({
    ...ad,
    show_top_badge: topAdIds.has(ad.id),
  }));
}

/** Stable: `show_top_badge` listings first. */
export function sortByTopBadgeFirst<T extends { show_top_badge?: boolean }>(
  items: T[],
): T[] {
  if (items.length <= 1) {
    return items;
  }
  const top: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (item.show_top_badge) {
      top.push(item);
    } else {
      rest.push(item);
    }
  }
  return [...top, ...rest];
}
