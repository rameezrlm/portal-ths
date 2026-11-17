export function parseLeaveDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  const normalized = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return normalized === value ? date : null;
}
export function leaveInputError(fromDate: unknown, toDate: unknown, reason: unknown): string | null {
  const from = parseLeaveDate(fromDate);
  const to = parseLeaveDate(toDate);
  if (!from || !to) return 'Choose a valid date range of up to 31 days.';
  const daySpan = (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) - Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) / 86400000;
  if (daySpan < 0 || daySpan > 30) return 'Choose a valid date range of up to 31 days.';
  if (typeof reason !== 'string' || reason.trim().length < 10 || reason.trim().length > 1000) return 'Give a reason between 10 and 1,000 characters.';
  return null;
}
