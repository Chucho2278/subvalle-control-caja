// backend/src/models/sucursal.model.ts
import { pool } from "../utils/db";

export interface Sucursal {
  id?: number;
  nombre: string;
  numero_tienda?: string | null;
  direccion?: string | null;
}

/**
 * Crear nueva sucursal
 */
export async function crearSucursal(s: Sucursal): Promise<void> {
  const sql = `
    INSERT INTO sucursales (nombre, numero_tienda, direccion)
    VALUES (?, ?, ?)
  `;
  await pool.query(sql, [
    s.nombre,
    s.numero_tienda ?? null,
    s.direccion ?? null,
  ]);
}

/**
 * Listar todas las sucursales
 */
export async function obtenerSucursales(): Promise<Sucursal[]> {
  const [rows]: any = await pool.query(
    `SELECT id, nombre, numero_tienda, direccion FROM sucursales ORDER BY nombre`
  );
  return rows;
}

/**
 * Obtener una por ID
 */
export async function obtenerSucursalPorId(
  id: number
): Promise<Sucursal | null> {
  const [rows]: any = await pool.query(
    `SELECT id, nombre, numero_tienda, direccion FROM sucursales WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows.length ? (rows[0] as Sucursal) : null;
}

/**
 * Actualizar sucursal
 */
export async function actualizarSucursal(
  id: number,
  s: Sucursal
): Promise<void> {
  const sql = `
    UPDATE sucursales
    SET nombre = ?, numero_tienda = ?, direccion = ?
    WHERE id = ?
  `;
  await pool.query(sql, [
    s.nombre,
    s.numero_tienda ?? null,
    s.direccion ?? null,
    id,
  ]);
}

/**
 * Eliminar sucursal
 */
export async function eliminarSucursal(id: number): Promise<void> {
  await pool.query(`DELETE FROM sucursales WHERE id = ?`, [id]);
}
