//src/utils/caja/fechas.ts
export function formatDateYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function maxToDateForFrom(fromYmd: string) {
  const [y, m] = fromYmd.split("-").map(Number);
  if (!y || !m) return fromYmd;
  const lastDayOfThirdMonth = new Date(y, m - 1 + 3, 0);
  return formatDateYMD(lastDayOfThirdMonth);
}
