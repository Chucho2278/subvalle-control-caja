// backend/src/models/caja.metricas.model.ts
import { pool } from "../utils/db";

export interface ConvenioDetalle {
  nombre: string;
  total: number;
}

export interface MetricasVentasResult {
  ventaTotal: number;
  efectivo: number;
  tarjetas: number;
  bonos: number;
  pagosInternos: number;
  diferencia: number;
  conveniosTotal: number;
  conveniosDetalle: ConvenioDetalle[];
}

/**
 * Obtiene sumatorias y detalle de convenios en el rango indicado.
 * - sucursalIds puede ser null para todas las sucursales.
 */
export async function obtenerMetricasDesgloseVentas(
  from: string,
  to: string,
  sucursalIds: number[] | null
): Promise<MetricasVentasResult> {
  if (!from || !to) {
    return {
      ventaTotal: 0,
      efectivo: 0,
      tarjetas: 0,
      bonos: 0,
      pagosInternos: 0,
      diferencia: 0,
      conveniosTotal: 0,
      conveniosDetalle: [],
    };
  }

  // Usamos DATE(...) BETWEEN ? AND ? para comparar por día (ajusta si necesitas horas)
  const baseWhere = "WHERE DATE(r.fecha_registro) BETWEEN ? AND ?";

  const paramsTotales: Array<string | number> = [from, to];
  let whereTotales = baseWhere;
  if (Array.isArray(sucursalIds) && sucursalIds.length > 0) {
    whereTotales += ` AND r.sucursal_id IN (${sucursalIds
      .map(() => "?")
      .join(",")})`;
    paramsTotales.push(...sucursalIds);
  }

  const sqlTotales = `
    SELECT
      COALESCE(SUM(r.venta_total_registrada), 0) AS ventaTotal,
      COALESCE(SUM(r.efectivo_en_caja), 0) AS efectivo,
      COALESCE(SUM(r.tarjetas), 0) AS tarjetas,
      COALESCE(SUM(r.bonos_sodexo), 0) AS bonos,
      COALESCE(SUM(r.pagos_internos), 0) AS pagosInternos,
      COALESCE(SUM(r.diferencia), 0) AS diferencia
    FROM registro_caja r
    ${whereTotales}
  `;

  const paramsConvenios: Array<string | number> = [from, to];
  let whereConvenios = baseWhere;
  if (Array.isArray(sucursalIds) && sucursalIds.length > 0) {
    whereConvenios += ` AND r.sucursal_id IN (${sucursalIds
      .map(() => "?")
      .join(",")})`;
    paramsConvenios.push(...sucursalIds);
  }

  const sqlConvenios = `
    SELECT
      COALESCE(rc.nombre_convenio, 'Sin nombre') AS nombre,
      COALESCE(SUM(rc.valor), 0) AS total
    FROM registro_caja r
    INNER JOIN registro_convenios rc ON rc.registro_caja_id = r.id
    ${whereConvenios}
    GROUP BY rc.nombre_convenio
    ORDER BY total DESC
  `;

  // Ejecutar totales
  const [rowsTotales]: any = await pool.query(sqlTotales, paramsTotales);
  const totalesRow =
    Array.isArray(rowsTotales) && rowsTotales.length
      ? rowsTotales[0]
      : {
          ventaTotal: 0,
          efectivo: 0,
          tarjetas: 0,
          bonos: 0,
          pagosInternos: 0,
          diferencia: 0,
        };

  // Ejecutar convenios
  const [rowsConvenios]: any = await pool.query(sqlConvenios, paramsConvenios);
  const conveniosRows = Array.isArray(rowsConvenios) ? rowsConvenios : [];

  const conveniosDetalle: ConvenioDetalle[] = conveniosRows.map((r: any) => ({
    nombre: String(r.nombre ?? "Sin nombre"),
    total: Number(r.total ?? 0),
  }));

  const conveniosTotal = conveniosDetalle.reduce((acc, c) => acc + c.total, 0);

  return {
    ventaTotal: Number(totalesRow.ventaTotal ?? 0),
    efectivo: Number(totalesRow.efectivo ?? 0),
    tarjetas: Number(totalesRow.tarjetas ?? 0),
    bonos: Number(totalesRow.bonos ?? 0),
    pagosInternos: Number(totalesRow.pagosInternos ?? 0),
    diferencia: Number(totalesRow.diferencia ?? 0),
    conveniosTotal,
    conveniosDetalle,
  };
}
