// frontend/src/utils/fechas.ts

/**
 * Ajusta una fecha ISO string del backend para mostrarla correctamente en Colombia (UTC-5).
 * El backend envía fechas en UTC, pero representan hora local de Colombia.
 * Para mostrar correctamente, sumamos 5 horas.
 */
export function ajustarFechaColombia(
  isoString: string | null | undefined,
): Date | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return null;
  date.setHours(date.getHours() + 5); // Sumar 5 horas para Colombia
  return date;
}

/**
 * Formatea una fecha ajustada para Colombia en formato local.
 */
export function formatFechaColombia(
  isoString: string | null | undefined,
): string {
  const adjusted = ajustarFechaColombia(isoString);
  return adjusted ? adjusted.toLocaleString() : "—";
}

/**
 * Convierte una fecha ajustada para Colombia a YYYY-MM-DD para inputs de fecha.
 */
export function formatFechaColombiaYYYYMMDD(
  isoString: string | null | undefined,
): string {
  const adjusted = ajustarFechaColombia(isoString);
  return adjusted ? adjusted.toISOString().slice(0, 10) : "";
}

/**
 * Convierte una fecha ajustada para Colombia a HH:MM para inputs de hora.
 */
export function formatHoraColombiaHHMM(
  isoString: string | null | undefined,
): string {
  const adjusted = ajustarFechaColombia(isoString);
  return adjusted ? adjusted.toISOString().slice(11, 16) : "";
}
