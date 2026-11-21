export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const todayKey = () => dateKey(new Date());

export const parseKey = (k: string) => new Date(k + 'T12:00:00');

export const addDays = (k: string, n: number) => {
  const d = parseKey(k);
  d.setDate(d.getDate() + n);
  return dateKey(d);
};

export const fmtLong = (k: string) =>
  parseKey(k).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const fmtMonth = (year: number, month: number) =>
  new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const fmtShort = (k: string) =>
  parseKey(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const weekday = (k: string) =>
  parseKey(k).toLocaleDateString('en-US', { weekday: 'short' });

/** Sunday-first month grid. */
export function monthMatrix(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= days; d++) cells.push(dateKey(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

export const greeting = (hour: number) =>
  hour < 5 ? 'Good Night' : hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

/** Monday-first week containing the given date (7 keys). */
export function weekOf(k: string): string[] {
  const d = parseKey(k);
  const mondayOffset = (d.getDay() + 6) % 7;
  const start = addDays(k, -mondayOffset);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
