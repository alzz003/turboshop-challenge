export function formatYearRange(
  startYear?: number,
  endYear?: number,
): string | undefined {
  if (startYear && endYear) {
    return startYear === endYear ? String(startYear) : `${startYear}-${endYear}`;
  }

  return startYear ? String(startYear) : undefined;
}
