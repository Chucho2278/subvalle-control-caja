// backend/src/utils/diffChanges.ts
export type ChangeEntry = {
  field: string;
  before: unknown;
  after: unknown;
};

const AUDITABLE_FIELDS = new Set<string>([
  "venta_total_registrada",
  "efectivo_en_caja",
  "tarjetas",
  "tarjetas_cantidad",
  "convenios",
  "convenios_cantidad",
  "bonos_sodexo",
  "bonos_sodexo_cantidad",
  "pagos_internos",
  "pagos_internos_cantidad",
  "observacion",
  "cajero_nombre",
  "cajero_cedula",
  "turno",
  "fecha_registro",
]);

function normalize(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v === undefined || v === null) return null;

  if (typeof v === "number") return Number(v);

  if (typeof v === "string") {
    const n = Number(v);
    return Number.isNaN(n) ? v.trim() : n;
  }

  return v;
}

export function diffChanges(
  original: Record<string, unknown> | null,
  updated: Record<string, unknown>
): ChangeEntry[] {
  const changes: ChangeEntry[] = [];

  for (const key of Object.keys(updated)) {
    if (!AUDITABLE_FIELDS.has(key)) continue;

    const before = normalize(original?.[key]);
    const after = normalize(updated[key]);

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes.push({
        field: key,
        before,
        after,
      });
    }
  }

  return changes;
}
