export type EqualityFn<T> = (left: T, right: T) => boolean;
export type CompareFn<T> = (left: T, right: T) => number;

export function linearSearch<T>(
  items: readonly T[],
  target: T,
  equals: EqualityFn<T> = (left, right) => left === right,
): number {
  for (let index = 0; index < items.length; index += 1) {
    if (equals(items[index], target)) {
      return index;
    }
  }

  return -1;
}

export function linearSearchBy<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  for (let index = 0; index < items.length; index += 1) {
    if (predicate(items[index])) {
      return index;
    }
  }

  return -1;
}

export function binarySearch<T>(items: readonly T[], target: T, compare: CompareFn<T>): number {
  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);
    const comparison = compare(items[middle], target);

    if (comparison === 0) {
      return middle;
    }

    if (comparison < 0) {
      left = middle + 1;
      continue;
    }

    right = middle - 1;
  }

  return -1;
}

export function binarySearchByKey<T, K>(
  items: readonly T[],
  targetValue: K,
  getComparableValue: (item: T) => K,
  compareValues: CompareFn<K>,
): number {
  let left = 0;
  let right = items.length - 1;

  while (left <= right) {
    const middle = left + Math.floor((right - left) / 2);
    const middleValue = getComparableValue(items[middle]);
    const comparison = compareValues(middleValue, targetValue);

    if (comparison === 0) {
      return middle;
    }

    if (comparison < 0) {
      left = middle + 1;
      continue;
    }

    right = middle - 1;
  }

  return -1;
}
