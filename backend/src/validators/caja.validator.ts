// backend/src/validators/caja.validator.ts
import { z } from "zod";

/**
 * Intenta convertir distintos formatos a número:
 * - acepta number
 * - acepta string con separador de miles '.' y coma decimal ','
 * - si no puede convertir, devuelve undefined
 */
function parseToNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const cleaned = v.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/**
 * Helper que crea un Zod schema que:
 * - preprocesa el valor intentando convertir a número
 * - deja el campo como optional
 * - valida que, si hay número, sea >= 0 (si se desea)
 */
function coerceNonNegativeNumberSchema() {
  return z
    .preprocess((v) => parseToNumber(v), z.number())
    .optional()
    .refine((x) => x === undefined || (typeof x === "number" && x >= 0), {
      message: "Debe ser un número >= 0",
    });
}

/**
 * Helper para enteros no negativos (cantidad)
 */
function coerceNonNegativeIntSchema() {
  return z
    .preprocess((v) => {
      const n = parseToNumber(v);
      return n === undefined ? undefined : Math.trunc(n);
    }, z.number().int())
    .optional()
    .refine((x) => x === undefined || (typeof x === "number" && x >= 0), {
      message: "Debe ser entero >= 0",
    });
}

/** Schema para items de convenios */
const ConvenioItemSchema = z.object({
  convenio_id: z
    .preprocess((v) => {
      if (v === null || v === undefined || v === "") return null;
      if (typeof v === "number") return Math.trunc(v);
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : null;
      }
      return null;
    }, z.number().int().nullable())
    .optional(),
  nombre_convenio: z.string().nullable().optional(),
  cantidad: coerceNonNegativeIntSchema(),
  valor: coerceNonNegativeNumberSchema(),
});

/**
 * Schema principal que acepta tanto camelCase como snake_case
 * y tolera null/undefined en observacion.
 */
export const DatosCajaSchema = z.object({
  // meta
  restaurante: z.string().optional(),

  // turno
  turno: z.enum(["A", "B", "C", "D"]).optional(),

  // fecha / hora
  fecha_registro: z.string().optional(),
  hora_registro: z.string().optional(),

  // valores: permitimos tanto camel como snake; todos opcionales (se valida en servicios si es requerido)
  ventaTotalRegistrada: coerceNonNegativeNumberSchema(),
  venta_total_registrada: coerceNonNegativeNumberSchema(),

  efectivoEnCaja: coerceNonNegativeNumberSchema(),
  efectivo_en_caja: coerceNonNegativeNumberSchema(),

  tarjetas: coerceNonNegativeNumberSchema(),
  tarjetas_cantidad: coerceNonNegativeIntSchema(),
  tarjetasCantidad: coerceNonNegativeIntSchema(),

  convenios: coerceNonNegativeNumberSchema(),
  convenios_cantidad: coerceNonNegativeIntSchema(),
  conveniosCantidad: coerceNonNegativeIntSchema(),

  bonosSodexo: coerceNonNegativeNumberSchema(),
  bonos_sodexo: coerceNonNegativeNumberSchema(),
  bonosSodexo_cantidad: coerceNonNegativeIntSchema(),
  bonos_sodexo_cantidad: coerceNonNegativeIntSchema(),

  pagosInternos: coerceNonNegativeNumberSchema(),
  pagos_internos: coerceNonNegativeNumberSchema(),
  pagosInternos_cantidad: coerceNonNegativeIntSchema(),
  pagos_internos_cantidad: coerceNonNegativeIntSchema(),

  // observación puede ser string o null (y opcional)
  observacion: z.union([z.string(), z.null()]).optional(),

  // cajero
  cajero_nombre: z.string().optional(),
  cajero_cedula: z.string().optional(),

  // sucursal id
  sucursal_id: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      if (typeof v === "number") return Math.trunc(v);
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? Math.trunc(n) : undefined;
      }
      return undefined;
    }, z.number().int().optional())
    .optional(),

  // detalle convenios
  convenios_items: z.array(ConvenioItemSchema).optional(),
});

/**
 * Schema para PATCH — todo opcional
 */
export const updateCajaSchema = DatosCajaSchema.partial();
