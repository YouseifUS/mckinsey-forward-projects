const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ARABIC_NUMBER_FORMATTER = new Intl.NumberFormat('ar-EG');

function pad(value: number) {
  return value.toString().padStart(2, '0');
}

/** Returns a local calendar date. It intentionally does not slice a UTC ISO string. */
export function toLocalDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseLocalDateKey(dateKey: string): Date | null {
  const match = DATE_KEY_PATTERN.exec(dateKey);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function isValidDateKey(dateKey: string): boolean {
  return parseLocalDateKey(dateKey) !== null;
}

export function addCalendarDays(dateKey: string, amount: number): string {
  const date = parseLocalDateKey(dateKey);
  if (!date) throw new Error(`تاريخ محلي غير صحيح: ${dateKey}`);
  date.setDate(date.getDate() + amount);
  return toLocalDateKey(date);
}

export function isFutureDateKey(dateKey: string, todayKey = toLocalDateKey()): boolean {
  if (!isValidDateKey(dateKey) || !isValidDateKey(todayKey)) {
    throw new Error('مينفعش نقارن تاريخ محلي غير صحيح.');
  }
  return dateKey > todayKey;
}

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0, 0);
}

export function moveMonth(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12, 0, 0, 0);
}

export function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('ar-EG-u-ca-gregory', { month: 'long', year: 'numeric' }).format(date);
}

export function formatFriendlyDate(date = new Date()): string {
  return new Intl.DateTimeFormat('ar-EG-u-ca-gregory', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatArabicNumber(value: number): string {
  return ARABIC_NUMBER_FORMATTER.format(value);
}
