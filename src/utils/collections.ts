export type SortDirection = "asc" | "desc";

export type FilterCriteria<T> = Partial<{
  [K in keyof T]: T[K] | ((value: T[K], item: T) => boolean);
}>;

export type Comparator<T> = (a: T, b: T) => number;

export function filterBy<T>(items: readonly T[], predicate: (item: T) => boolean): T[] {
  return items.filter(predicate);
}

export function filterByCriteria<T extends object>(
  items: readonly T[],
  criteria: FilterCriteria<T>,
): T[] {
  const entries = Object.entries(criteria) as [keyof T, FilterCriteria<T>[keyof T]][];

  if (entries.length === 0) {
    return [...items];
  }

  return items.filter((item) => {
    return entries.every(([key, criterion]) => {
      if (criterion === undefined) {
        return true;
      }

      const value = item[key];

      if (typeof criterion === "function") {
        return criterion(value, item);
      }

      return value === criterion;
    });
  });
}

function comparePrimitiveValues(
  a: string | number | boolean | Date,
  b: string | number | boolean | Date,
): number {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
}

export function sortBy<T>(items: readonly T[], comparator: Comparator<T>): T[] {
  return [...items].sort(comparator);
}

export function sortByKey<T, K extends keyof T>(
  items: readonly T[],
  key: K,
  direction: SortDirection = "asc",
): T[] {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    const left = a[key];
    const right = b[key];

    if (
      left instanceof Date ||
      right instanceof Date ||
      typeof left === "string" ||
      typeof left === "number" ||
      typeof left === "boolean" ||
      typeof right === "string" ||
      typeof right === "number" ||
      typeof right === "boolean"
    ) {
      return (
        comparePrimitiveValues(
          left as string | number | boolean | Date,
          right as string | number | boolean | Date,
        ) * multiplier
      );
    }

    return 0;
  });
}

export function sortByMultipleCriteria<T>(
  items: readonly T[],
  comparators: readonly Comparator<T>[],
): T[] {
  if (comparators.length === 0) {
    return [...items];
  }

  return [...items].sort((a, b) => {
    for (const comparator of comparators) {
      const result = comparator(a, b);
      if (result !== 0) {
        return result;
      }
    }

    return 0;
  });
}

export function groupBy<T, K>(items: readonly T[], keySelector: (item: T) => K): Map<K, T[]> {
  return items.reduce((accumulator, currentItem) => {
    const key = keySelector(currentItem);
    const existing = accumulator.get(key) ?? [];
    accumulator.set(key, [...existing, currentItem]);
    return accumulator;
  }, new Map<K, T[]>());
}
