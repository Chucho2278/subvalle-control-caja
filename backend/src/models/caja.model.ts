//backend/src/models/caja.model.ts
import { pool } from "../utils/db";
import {
  crearRegistroConvenioConn,
  // asegúrate que registroConvenio.model exporte crearRegistroConvenioConn(conn, payload)
} from "./registroConvenio.model";

export interface RegistroCajaRow {
  id?: number;
  restaurante?: string;
  sucursal_id?: number | null;
  turno?: "A" | "B" | "C" | "D";
  fecha_registro?: Date | string | null;
  venta_total_registrada?: number;
  efectivo_en_caja?: number;
  tarjetas?: number;
  tarjetas_cantidad?: number;
  convenios?: number;
  convenios_cantidad?: number;
  bonos_sodexo?: number;
  bonos_sodexo_cantidad?: number;
  pagos_internos?: number;
  pagos_internos_cantidad?: number;
  valor_consignar?: number;
  dinero_registrado?: number;
  diferencia?: number;
  estado?: string;
  observacion?: string | null;
  cajero_nombre?: string | null;
  cajero_cedula?: string | null;
  creado_en?: string;
}

/**
 * Normaliza un valor de fecha (acepta Date | string | null) y devuelve
 * una instancia Date o null. Evita lanzar en inputs inválidos.
 */
function normalizeFechaMaybe(v?: Date | string | null): Date | null {
  if (v == null) return null;
  try {
    if (v instanceof Date) {
      if (!isNaN(v.getTime())) return v;
      return null;
    }
    const s = String(v).trim();
    if (!s) return null;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
    const d2 = new Date(s + "T00:00:00");
    if (!isNaN(d2.getTime())) return d2;
    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda un registro de caja y sus convenios (si vienen) en una transacción.
 */
export async function guardarRegistro(
  registro: Omit<RegistroCajaRow, "id" | "creado_en">,
  conveniosItems?: Array<{
    convenio_id?: number | null;
    nombre_convenio?: string | null;
    cantidad: number;
    valor: number;
  }>
): Promise<number> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sql = `
      INSERT INTO registro_caja
      (restaurante, sucursal_id, turno, fecha_registro, venta_total_registrada, efectivo_en_caja,
       tarjetas, tarjetas_cantidad, convenios, convenios_cantidad,
       bonos_sodexo, bonos_sodexo_cantidad, pagos_internos, pagos_internos_cantidad,
       valor_consignar, dinero_registrado, diferencia, estado, observacion,
       cajero_nombre, cajero_cedula)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const fecha = normalizeFechaMaybe(registro.fecha_registro);

    const params = [
      registro.restaurante ?? null,
      registro.sucursal_id ?? null,
      registro.turno ?? null,
      fecha ? fecha : null,
      registro.venta_total_registrada ?? 0,
      registro.efectivo_en_caja ?? 0,
      registro.tarjetas ?? 0,
      registro.tarjetas_cantidad ?? 0,
      registro.convenios ?? 0,
      registro.convenios_cantidad ?? 0,
      registro.bonos_sodexo ?? 0,
      registro.bonos_sodexo_cantidad ?? 0,
      registro.pagos_internos ?? 0,
      registro.pagos_internos_cantidad ?? 0,
      registro.valor_consignar ?? 0,
      registro.dinero_registrado ?? 0,
      registro.diferencia ?? 0,
      registro.estado ?? null,
      registro.observacion ?? null,
      registro.cajero_nombre ?? null,
      registro.cajero_cedula ?? null,
    ];

    const [result]: any = await conn.query(sql, params);
    const insertId = Number(result.insertId);

    if (Array.isArray(conveniosItems) && conveniosItems.length > 0) {
      for (const it of conveniosItems) {
        await crearRegistroConvenioConn(conn, {
          registro_caja_id: insertId,
          convenio_id: it.convenio_id ?? null,
          nombre_convenio: it.nombre_convenio ?? null,
          cantidad: it.cantidad,
          valor: it.valor,
        } as any);
      }
    }

    await conn.commit();
    return insertId;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Obtener un registro por id (registro_caja row).
 */
export async function obtenerRegistroPorId(id: number) {
  const sql = `
    SELECT *
    FROM registro_caja
    WHERE id = ?
    LIMIT 1
  `;
  const [rows]: any = await pool.query(sql, [id]);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/**
 * Elimina convenios asociados a un registro de caja.
 */
export async function eliminarConveniosPorRegistroId(
  id: number
): Promise<void> {
  await pool.query(
    `DELETE FROM registro_convenios WHERE registro_caja_id = ?`,
    [id]
  );
}

/**
 * Elimina un registro de caja y sus convenios relacionados en una transacción.
 */
export async function eliminarRegistroCaja(id: number): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `DELETE FROM registro_convenios WHERE registro_caja_id = ?`,
      [id]
    );

    const [result]: any = await conn.query(
      `DELETE FROM registro_caja WHERE id = ?`,
      [id]
    );

    await conn.commit();
    return Number(result.affectedRows ?? result.affected ?? 0) > 0;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Actualiza un registro de caja y (opcional) reemplaza sus convenios asociados.
 */
export async function actualizarRegistroCajaTransaccional(
  id: number,
  cambios: Partial<Omit<RegistroCajaRow, "id" | "creado_en">>,
  conveniosItems?: Array<{
    convenio_id?: number | null;
    nombre_convenio?: string | null;
    cantidad: number;
    valor: number;
  }>
): Promise<boolean> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const sets: string[] = [];
    const params: any[] = [];

    const updatableFields: Array<keyof RegistroCajaRow> = [
      "restaurante",
      "sucursal_id",
      "turno",
      "fecha_registro",
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
      "valor_consignar",
      "dinero_registrado",
      "diferencia",
      "estado",
      "observacion",
      "cajero_nombre",
      "cajero_cedula",
    ];

    for (const f of updatableFields) {
      if (Object.prototype.hasOwnProperty.call(cambios, f)) {
        sets.push(`${String(f)} = ?`);
        const v = (cambios as any)[f];
        if (f === "fecha_registro") {
          params.push(v ? normalizeFechaMaybe(v as any) : null);
        } else {
          params.push(v ?? null);
        }
      }
    }

    if (sets.length > 0) {
      const sqlUpd = `UPDATE registro_caja SET ${sets.join(", ")} WHERE id = ?`;
      params.push(id);
      const [resUpd]: any = await conn.query(sqlUpd, params);
    } else {
      const [rows]: any = await conn.query(
        `SELECT id FROM registro_caja WHERE id = ? LIMIT 1`,
        [id]
      );
      if (!Array.isArray(rows) || rows.length === 0) {
        await conn.rollback();
        return false;
      }
    }

    if (Array.isArray(conveniosItems)) {
      await conn.query(
        `DELETE FROM registro_convenios WHERE registro_caja_id = ?`,
        [id]
      );

      for (const it of conveniosItems) {
        await crearRegistroConvenioConn(conn, {
          registro_caja_id: id,
          convenio_id: it.convenio_id ?? null,
          nombre_convenio: it.nombre_convenio ?? null,
          cantidad: it.cantidad,
          valor: it.valor,
        } as any);
      }
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Obtener resumen por turno (ejemplo mínimo).
 */
export async function obtenerResumenPorTurno(
  fromDate: string,
  toDate: string,
  restaurante?: string | null,
  sucursal_id?: number | null
) {
  const params: any[] = [fromDate, toDate];

  let where = ` WHERE DATE(r.fecha_registro) BETWEEN ? AND ? `;

  if (restaurante && restaurante.trim() !== "") {
    where += ` AND r.restaurante = ? `;
    params.push(restaurante);
  } else if (typeof sucursal_id === "number") {
    where += ` AND r.sucursal_id = ? `;
    params.push(Number(sucursal_id));
  }

  // Usamos alias consistentes en español
  const sql = `
    SELECT
      r.turno AS turno,
      COALESCE(SUM(r.venta_total_registrada), 0) AS ventaTotal,
      COALESCE(SUM(r.efectivo_en_caja), 0) AS efectivo,
      COALESCE(SUM(r.tarjetas), 0) AS tarjetas,
      COALESCE(SUM(r.tarjetas_cantidad), 0) AS tarjetasCantidad,
      COALESCE(SUM(rc.valor), 0) AS convenios,
      COALESCE(SUM(rc.cantidad), 0) AS conveniosCantidad,
      COALESCE(SUM(r.bonos_sodexo), 0) AS bonos,
      COALESCE(SUM(r.bonos_sodexo_cantidad), 0) AS bonosCantidad,
      COALESCE(SUM(r.pagos_internos), 0) AS pagosInternos,
      COALESCE(SUM(r.pagos_internos_cantidad), 0) AS pagosInternosCantidad,
      COALESCE(SUM(r.dinero_registrado), 0) AS dineroRegistrado,
      COALESCE(SUM(r.valor_consignar), 0) AS valorConsignar,
      COALESCE(SUM(r.diferencia), 0) AS diferencia
    FROM registro_caja r
    LEFT JOIN registro_convenios rc ON rc.registro_caja_id = r.id
    ${where}
    GROUP BY r.turno
    ORDER BY r.turno
  `;

  const [rows] = await pool.query(sql, params);
  return rows as Record<string, unknown>[];
}

/**
 * Obtener top cajeros por faltantes/sobrantes (agregado).
 * tipo: 'faltantes' | 'sobrantes'
 */
export const obtenerTopCajerosDescuadres = async (
  fechaFrom: string,
  fechaTo: string,
  restaurante: string | null = null,
  sucursalIds: number[] | null = null,
  tipo: "faltantes" | "sobrantes" = "faltantes",
  limit: number = 10
): Promise<Array<Record<string, unknown>>> => {
  const condiciones: string[] = [];
  const params: Array<unknown> = [];

  condiciones.push("DATE(fecha_registro) BETWEEN ? AND ?");
  params.push(fechaFrom, fechaTo);

  if (restaurante) {
    condiciones.push("restaurante = ?");
    params.push(restaurante);
  }

  if (Array.isArray(sucursalIds) && sucursalIds.length > 0) {
    if (sucursalIds.length === 1) {
      condiciones.push("sucursal_id = ?");
      params.push(sucursalIds[0]);
    } else {
      condiciones.push(
        `sucursal_id IN (${sucursalIds.map(() => "?").join(",")})`
      );
      params.push(...sucursalIds);
    }
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  // Agregados comunes
  const aggSelect = `
    COALESCE(cajero_cedula, '') AS cajero_cedula,
    COALESCE(cajero_nombre, '') AS cajero_nombre,
    SUM(CASE WHEN diferencia < 0 THEN 1 ELSE 0 END) AS faltantes_count,
    SUM(CASE WHEN diferencia < 0 THEN ABS(diferencia) ELSE 0 END) AS faltantes_total,
    SUM(CASE WHEN diferencia > 0 THEN 1 ELSE 0 END) AS sobrantes_count,
    SUM(CASE WHEN diferencia > 0 THEN diferencia ELSE 0 END) AS sobrantes_total,
    COUNT(*) AS total_registros,
    SUM(diferencia) AS neto
  `;

  const orderBy =
    tipo === "faltantes" ? "faltantes_total DESC" : "sobrantes_total DESC";

  const sql = `
    SELECT ${aggSelect}
    FROM registro_caja
    ${where}
    GROUP BY cajero_cedula, cajero_nombre
    ORDER BY ${orderBy}
    LIMIT ?
  `;

  const [rows] = (await pool.query(sql, [...params, limit])) as unknown as [
    Array<Record<string, unknown>>,
    unknown
  ];
  return Array.isArray(rows) ? rows : [];
};

/**
 * Obtener registros (detalle) para un cajero en rango de fechas
 */
export const obtenerRegistrosPorCajeroYFecha = async (
  cajeroCedula: string,
  fechaFrom: string,
  fechaTo: string,
  restaurante: string | null = null,
  sucursalIds: number[] | null = null
): Promise<Array<Record<string, unknown>>> => {
  const condiciones: string[] = [];
  const params: Array<unknown> = [];

  condiciones.push("DATE(fecha_registro) BETWEEN ? AND ?");
  params.push(fechaFrom, fechaTo);

  condiciones.push(
    "(cajero_cedula = ? OR cajero_cedula IS NOT NULL AND ? = '')"
  );
  // we'll pass cajeroCedula twice; if empty string, this cond becomes true for all? safer: use direct equality
  // Better to require cajeroCedula non-empty from caller; implement simple filter:
  condiciones.push("cajero_cedula = ?");
  params.push(cajeroCedula);

  if (restaurante) {
    condiciones.push("restaurante = ?");
    params.push(restaurante);
  }

  if (Array.isArray(sucursalIds) && sucursalIds.length > 0) {
    if (sucursalIds.length === 1) {
      condiciones.push("sucursal_id = ?");
      params.push(sucursalIds[0]);
    } else {
      condiciones.push(
        `sucursal_id IN (${sucursalIds.map(() => "?").join(",")})`
      );
      params.push(...sucursalIds);
    }
  }

  const where = condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "";

  const sql = `
    SELECT *
    FROM registro_caja
    ${where}
    ORDER BY fecha_registro DESC
  `;

  const [rows] = (await pool.query(sql, params)) as unknown as [
    Array<Record<string, unknown>>,
    unknown
  ];
  return Array.isArray(rows) ? rows : [];
};
