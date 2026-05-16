/**
 * Parses dates from ISO (YYYY-MM-DD) or day-first formats (DD-MM-YYYY, DD/MM/YYYY).
 */
export const parseFlexibleDate = (
  value: string | Date | null | undefined
): Date | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('joining_date must be a valid date');
    }
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const date = toUtcDate(year, month, day);
    if (date) {
      return date;
    }
  }

  const dayFirstMatch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(trimmed);
  if (dayFirstMatch) {
    const day = Number(dayFirstMatch[1]);
    const month = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3]);
    const date = toUtcDate(year, month, day);
    if (date) {
      return date;
    }
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  throw new Error(
    'joining_date must be a valid date (use YYYY-MM-DD or DD-MM-YYYY)'
  );
};

const toUtcDate = (
  year: number,
  month: number,
  day: number
): Date | null => {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};
