import {
  Country,
  CountryVolumeSummary,
  OnboardingLead,
  OnboardingTimeline,
  getAccountSegment,
} from "../types/models";

export function countByCategory<T, K>(
  items: readonly T[],
  getCategory: (item: T) => K,
): Map<K, number> {
  return items.reduce((accumulator, currentItem) => {
    const category = getCategory(currentItem);
    const currentCount = accumulator.get(category) ?? 0;
    accumulator.set(category, currentCount + 1);
    return accumulator;
  }, new Map<K, number>());
}

export function sumBy<T>(items: readonly T[], getValue: (item: T) => number): number {
  return items.reduce((total, currentItem) => total + getValue(currentItem), 0);
}

export function averageBy<T>(items: readonly T[], getValue: (item: T) => number): number | null {
  if (items.length === 0) {
    return null;
  }

  return sumBy(items, getValue) / items.length;
}

export function maxBy<T>(items: readonly T[], getValue: (item: T) => number): T | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((maxItem, currentItem) => {
    return getValue(currentItem) > getValue(maxItem) ? currentItem : maxItem;
  });
}

export function minBy<T>(items: readonly T[], getValue: (item: T) => number): T | null {
  if (items.length === 0) {
    return null;
  }

  return items.reduce((minItem, currentItem) => {
    return getValue(currentItem) < getValue(minItem) ? currentItem : minItem;
  });
}

export function countLeadsBySegment(leads: readonly OnboardingLead[]): Record<string, number> {
  return leads.reduce<Record<string, number>>((accumulator, lead) => {
    const segment = getAccountSegment(lead.monthlyVolume);
    const currentCount = accumulator[segment] ?? 0;
    return {
      ...accumulator,
      [segment]: currentCount + 1,
    };
  }, {});
}

export function monthlyVolumeForecastByCountry(
  leads: readonly OnboardingLead[],
): Record<Country, number> {
  const initial: Record<Country, number> = {
    Mexico: 0,
    Espana: 0,
  };

  return leads.reduce((accumulator, lead) => {
    return {
      ...accumulator,
      [lead.country]: accumulator[lead.country] + lead.monthlyVolume,
    };
  }, initial);
}

export function buildCountryVolumeSummary(
  leads: readonly OnboardingLead[],
): CountryVolumeSummary[] {
  const forecast = monthlyVolumeForecastByCountry(leads);
  const groupedByCountry = countByCategory(leads, (lead) => lead.country);

  return (Object.keys(forecast) as Country[]).map((country) => {
    const totalLeads = groupedByCountry.get(country) ?? 0;
    const totalMonthlyVolume = forecast[country];
    const averageMonthlyVolume = totalLeads === 0 ? 0 : totalMonthlyVolume / totalLeads;

    return {
      country,
      totalLeads,
      totalMonthlyVolume,
      averageMonthlyVolume,
    };
  });
}

export function averageOnboardingTimeInHours(timelines: readonly OnboardingTimeline[]): number | null {
  if (timelines.length === 0) {
    return null;
  }

  const milliseconds = sumBy(
    timelines,
    (timeline) => timeline.activatedAt.getTime() - timeline.registeredAt.getTime(),
  );

  return milliseconds / timelines.length / (1000 * 60 * 60);
}
