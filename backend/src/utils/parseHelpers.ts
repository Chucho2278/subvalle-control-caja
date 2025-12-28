// src/utils/parseHelpers.ts
export function isIsoYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? ""));
}

/**
 * parseSucursalIds:
 * - acepta string con comas, array o número
 * - retorna array de números o null si no hay ninguno
 */
export function parseSucursalIds(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    return (raw as unknown[])
      .flatMap((x) => String(x).split(","))
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  } else if (typeof raw === "string" && raw.trim() !== "") {
    return String(raw)
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  } else if (typeof raw === "number" && !Number.isNaN(raw)) {
    return [Number(raw)];
  }
  return null;
}
