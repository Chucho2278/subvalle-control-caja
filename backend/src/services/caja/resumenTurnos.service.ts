import { obtenerResumenPorTurno } from "../../models/caja.model";
import {
  normalizeResumenRow,
  ResumenRow,
} from "../../utils/caja/resumenNormalizer";

/**
 * El resumen por turno ES exactamente un ResumenRow
 */
export type ResumenTurno = ResumenRow;

/**
 * Totales: mismo shape que ResumenRow pero sin "turno"
 */
export type TotalesResumen = Omit<ResumenRow, "turno">;

/**
 * Obtener resumen por turnos y totales generales
 */
export const obtenerResumenTurnosService = async (
  fechaFrom: string,
  fechaTo: string,
  restaurante: string | null,
  sucursalId: number | null
): Promise<{
  resumen: ResumenTurno[];
  total: TotalesResumen;
}> => {
  const raw = await obtenerResumenPorTurno(
    fechaFrom,
    fechaTo,
    restaurante,
    sucursalId
  );

  const resumen: ResumenTurno[] = (Array.isArray(raw) ? raw : []).map((r) =>
    normalizeResumenRow(r as Record<string, unknown>)
  );

  const total = resumen.reduce<TotalesResumen>(
    (acc, r) => {
      acc.ventaTotal += r.ventaTotal;
      acc.efectivo += r.efectivo;
      acc.tarjetas += r.tarjetas;
      acc.tarjetasCantidad += r.tarjetasCantidad;
      acc.convenios += r.convenios;
      acc.conveniosCantidad += r.conveniosCantidad;
      acc.bonos += r.bonos;
      acc.bonosCantidad += r.bonosCantidad;
      acc.pagosInternos += r.pagosInternos;
      acc.pagosInternosCantidad += r.pagosInternosCantidad;
      acc.dineroRegistrado += r.dineroRegistrado;
      acc.valorConsignar += r.valorConsignar;
      acc.diferencia += r.diferencia;
      return acc;
    },
    {
      ventaTotal: 0,
      efectivo: 0,
      tarjetas: 0,
      tarjetasCantidad: 0,
      convenios: 0,
      conveniosCantidad: 0,
      bonos: 0,
      bonosCantidad: 0,
      pagosInternos: 0,
      pagosInternosCantidad: 0,
      dineroRegistrado: 0,
      valorConsignar: 0,
      diferencia: 0,
    }
  );

  return { resumen, total };
};
