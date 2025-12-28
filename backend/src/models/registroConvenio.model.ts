// backend/src/models/registroConvenio.model.ts
import { pool } from "../utils/db";
import type { PoolConnection } from "mysql2/promise";

/**
 * Tipo local para un convenio asociado a un registro de caja
 */
export interface RegistroConvenio {
  id?: number;
  registro_caja_id: number;
  convenio_id?: number | null;
  nombre_convenio?: string | null;
  cantidad: number;
  valor: number; // total por ese convenio
  creado_en?: string;
}

/**
 * Inserta un registro_convenio usando una conexión (transaccional).
 * Devuelve insertId.
 * - conn: conexión obtenida con pool.getConnection()
 * - row: datos del convenio (sin id ni creado_en)
 */
export async function crearRegistroConvenioConn(
  conn: PoolConnection,
  row: Omit<RegistroConvenio, "id" | "creado_en">
): Promise<number> {
  if (!conn || typeof conn.query !== "function") {
    throw new Error(
      "Se requiere una conexión válida (crearRegistroConvenioConn)."
    );
  }
  const sql = `
    INSERT INTO registro_convenios
      (registro_caja_id, convenio_id, nombre_convenio, cantidad, valor)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result]: any = await conn.query(sql, [
    row.registro_caja_id,
    row.convenio_id ?? null,
    row.nombre_convenio ?? null,
    row.cantidad,
    row.valor,
  ]);
  return Number(result.insertId);
}

/**
 * Inserta un registro_convenio sin transacción (usa pool.query).
 * Útil si no necesitas transacción.
 */
export async function crearRegistroConvenioSimple(
  row: Omit<RegistroConvenio, "id" | "creado_en">
): Promise<number> {
  const sql = `
    INSERT INTO registro_convenios
      (registro_caja_id, convenio_id, nombre_convenio, cantidad, valor)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result]: any = await pool.query(sql, [
    row.registro_caja_id,
    row.convenio_id ?? null,
    row.nombre_convenio ?? null,
    row.cantidad,
    row.valor,
  ]);
  return Number(result.insertId);
}

/**
 * Elimina convenios asociados a un registro usando una conexión (transaccional).
 * - conn: conexión con beginTransaction activa en el caller.
 */
export async function eliminarConveniosPorRegistroIdConn(
  conn: PoolConnection,
  registroCajaId: number
): Promise<void> {
  if (!conn || typeof conn.query !== "function") {
    throw new Error(
      "Se requiere una conexión válida (eliminarConveniosPorRegistroIdConn)."
    );
  }
  await conn.query(
    `DELETE FROM registro_convenios WHERE registro_caja_id = ?`,
    [registroCajaId]
  );
}

/**
 * Elimina convenios asociados a un registro (no transaccional, usa pool).
 */
export async function eliminarConveniosPorRegistroId(
  registroCajaId: number
): Promise<void> {
  await pool.query(
    `DELETE FROM registro_convenios WHERE registro_caja_id = ?`,
    [registroCajaId]
  );
}

/**
 * Obtener convenios asociados a un registro_caja_id
 */
export async function obtenerConveniosPorRegistroId(registroCajaId: number) {
  const sql = `
    SELECT id, registro_caja_id, convenio_id, nombre_convenio, cantidad, valor, creado_en
    FROM registro_convenios
    WHERE registro_caja_id = ?
    ORDER BY id
  `;
  const [rows]: any = await pool.query(sql, [registroCajaId]);
  return rows as RegistroConvenio[];
}
