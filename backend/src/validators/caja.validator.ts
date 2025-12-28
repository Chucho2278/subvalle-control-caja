// backend/src/validators/caja.validator.ts
import { z } from "zod";

export const DatosCajaSchema = z.object({
  restaurante: z.string(),
  turno: z.enum(["A", "B", "C", "D"]),
  ventaTotalRegistrada: z.number(),
  efectivoEnCaja: z.number(),
  tarjetas: z.number(),
  tarjetas_cantidad: z.number().int().nonnegative(),
  convenios: z.number(),
  convenios_cantidad: z.number().int().nonnegative(),
  bonosSodexo: z.number(),
  bonosSodexo_cantidad: z.number().int().nonnegative(),
  pagosInternos: z.number(),
  pagosInternos_cantidad: z.number().int().nonnegative(),
  observacion: z.string().optional(),

  // Nuevos campos (opcional en creación si quieres, o usa validateRequest para forzar)
  cajero_nombre: z.string().optional(),
  cajero_cedula: z.string().optional(),

  // opcional: permitir fecha_registro (YYYY-MM-DD)
  fecha_registro: z.string().optional(),
});

export const updateCajaSchema = DatosCajaSchema.partial();
