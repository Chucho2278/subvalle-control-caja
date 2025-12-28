//src/utils/caja/bodyReaders.ts
export function readNumber(
  body: Record<string, unknown> | null | undefined,
  keys: string[] = []
): number {
  if (!body) return 0;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      const s = v == null ? "" : String(v);
      const n = Number(s.replace(",", "."));
      if (!Number.isNaN(n)) return n;
      return 0;
    }
  }
  return 0;
}

export function readString(
  body: Record<string, unknown> | null | undefined,
  keys: string[] = []
): string | null {
  if (!body) return null;
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(body, k)) {
      const v = body[k];
      if (v === null || v === undefined) return null;
      return String(v);
    }
  }
  return null;
}
