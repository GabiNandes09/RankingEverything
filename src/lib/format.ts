/** "2026-03-05" (ISO, from a `<input type="date">`) -> "05/03/2026". */
export function formatEventDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return `${day}/${month}/${year}`;
}
