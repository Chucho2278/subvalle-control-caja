// src/services/caja/descuadres.service.ts
import { pool } from "../../utils/db";

/**
 * Tipos de salida
 */
export type TopItem = {
  cajero_cedula: string | null;
  cajero_nombre: string | null;
  faltantes_count: number;
  faltantes_total: number; // negativo o 0
  sobrantes_count: number;
  sobrantes_total: number; // positivo o 0
  total_registros: number;
  neto: number; // suma de diferencias (puede ser negativo/positivo)
};

/**
 * Obtener top de cajeros con más faltantes/sobrantes.
 * - sucursalIds: array de números o null
 * - limit: máximo elementos (aplica a cada lista)
 */
export const obtenerTopDescuadresService = async (
  from: string,
  to: string,
  restaurante: string | null,
  sucursalIds: number[] | null,
  limit = 10
): Promise<{ faltantes: TopItem[]; sobrantes: TopItem[] }> => {
  // Armamos WHERE dinámico
  const condiciones: string[] = ["DATE(fecha_registro) BETWEEN ? AND ?"];
  const params: Array<unknown> = [from, to];

  if (restaurante) {
    condiciones.push("restaurante = ?");
    params.push(restaurante);
  }
  if (Array.isArray(sucursalIds) && sucursalIds.length > 0) {
    condiciones.push(
      `sucursal_id IN (${sucursalIds.map(() => "?").join(",")})`
    );
    params.push(...sucursalIds);
  }

  const where = condiciones.length ? ` WHERE ${condiciones.join(" AND ")}` : "";

  // Query: agrupamos por cajero (cedula + nombre)
  // Sumamos conteos y sumas condicionadas
  const sql = `
    SELECT
      COALESCE(cajero_cedula, '') as cajero_cedula,
      COALESCE(cajero_nombre, '') as cajero_nombre,
      COUNT(*) as total_registros,
      SUM(CASE WHEN diferencia < 0 THEN 1 ELSE 0 END) as faltantes_count,
      SUM(CASE WHEN diferencia < 0 THEN diferencia ELSE 0 END) as faltantes_total,
      SUM(CASE WHEN diferencia > 0 THEN 1 ELSE 0 END) as sobrantes_count,
      SUM(CASE WHEN diferencia > 0 THEN diferencia ELSE 0 END) as sobrantes_total,
      SUM(diferencia) as neto
    FROM registro_caja
    ${where}
    GROUP BY cajero_cedula, cajero_nombre
  `;

  const [rows] = (await pool.query(sql, params)) as any;
  const arr = Array.isArray(rows) ? rows : [];

  // Convertir y separar en dos lists
  const mapped: TopItem[] = arr.map((r: any) => ({
    cajero_cedula: r.cajero_cedula || null,
    cajero_nombre: r.cajero_nombre || null,
    faltantes_count: Number(r.faltantes_count ?? 0),
    faltantes_total: Number(r.faltantes_total ?? 0), // negativo
    sobrantes_count: Number(r.sobrantes_count ?? 0),
    sobrantes_total: Number(r.sobrantes_total ?? 0), // positivo
    total_registros: Number(r.total_registros ?? 0),
    neto: Number(r.neto ?? 0),
  }));

  // Ordenar:
  // - faltantes: por monto absoluto de faltantes_total (más negativo -> mayor abs)
  // - sobrantes: por monto de sobrantes_total (mayor positivo)
  const faltantes = mapped
    .filter((m) => m.faltantes_count > 0)
    .sort(
      (a, b) =>
        Math.abs(b.faltantes_total) - Math.abs(a.faltantes_total) ||
        b.faltantes_count - a.faltantes_count
    )
    .slice(0, limit);

  const sobrantes = mapped
    .filter((m) => m.sobrantes_count > 0)
    .sort(
      (a, b) =>
        b.sobrantes_total - a.sobrantes_total ||
        b.sobrantes_count - a.sobrantes_count
    )
    .slice(0, limit);

  return { faltantes, sobrantes };
};

/**
 * Obtener registros completos por lista de cédulas (para detalle/export)
 * Retorna map: { cedula => rows[] }
 */
export const obtenerRegistrosParaCajeros = async (
  cedulas: string[],
  from: string,
  to: string,
  restaurante: string | null,
  sucursalIds: number[] | null
): Promise<Record<string, Array<Record<string, unknown>>>> => {
  if (!Array.isArray(cedulas) || cedulas.length === 0) return {};

  const condiciones: string[] = ["DATE(fecha_registro) BETWEEN ? AND ?"];
  const params: Array<unknown> = [from, to];

  if (restaurante) {
    condiciones.push("restaurante = ?");
    params.push(restaurante);
  }
  if (Array.isArray(sucursalIds) && sucursalIds.length > 0) {
    condiciones.push(
      `sucursal_id IN (${sucursalIds.map(() => "?").join(",")})`
    );
    params.push(...sucursalIds);
  }

  // cedulas IN (?,?,?)
  condiciones.push(`cajero_cedula IN (${cedulas.map(() => "?").join(",")})`);
  params.push(...cedulas);

  const where = condiciones.length ? ` WHERE ${condiciones.join(" AND ")}` : "";

  const sql = `
    SELECT *
    FROM registro_caja
    ${where}
    ORDER BY fecha_registro DESC
  `;

  const [rows] = (await pool.query(sql, params)) as any;
  const arr = Array.isArray(rows) ? rows : [];

  const map: Record<string, Array<Record<string, unknown>>> = {};
  for (const r of arr) {
    const ced = String(r.cajero_cedula ?? "");
    if (!map[ced]) map[ced] = [];
    map[ced].push(r);
  }
  return map;
};
