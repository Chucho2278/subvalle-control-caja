// backend/src/models/convenio.model.ts
import { pool } from "../utils/db";

export interface Convenio {
  id?: number;
  nombre: string;
  creado_en?: string;
  actualizado_en?: string;
}

/** Crear convenio */
export async function crearConvenio(
  c: Omit<Convenio, "id" | "creado_en" | "actualizado_en">
): Promise<number> {
  const sql = `INSERT INTO convenios (nombre) VALUES (?)`;
  const [result]: any = await pool.query(sql, [c.nombre]);
  return Number(result.insertId);
}

/** Listar todos */
export async function listarConvenios(): Promise<Convenio[]> {
  const sql = `SELECT id, nombre, creado_en, actualizado_en FROM convenios ORDER BY nombre`;
  const [rows]: any = await pool.query(sql);
  return rows as Convenio[];
}

/** Obtener por id */
export async function obtenerConvenioPorId(
  id: number
): Promise<Convenio | null> {
  const sql = `SELECT id, nombre, creado_en, actualizado_en FROM convenios WHERE id = ? LIMIT 1`;
  const [rows]: any = await pool.query(sql, [id]);
  return rows.length ? (rows[0] as Convenio) : null;
}

/** Actualizar */
export async function actualizarConvenio(
  id: number,
  cambios: Partial<Convenio>
): Promise<boolean> {
  const campos: string[] = [];
  const valores: any[] = [];

  if (typeof cambios.nombre === "string") {
    campos.push("nombre = ?");
    valores.push(cambios.nombre);
  }

  if (campos.length === 0) return false;

  const sql = `UPDATE convenios SET ${campos.join(", ")} WHERE id = ?`;
  valores.push(id);
  const [result]: any = await pool.query(sql, valores);
  return result && result.affectedRows > 0;
}

/** Eliminar */
export async function eliminarConvenio(id: number): Promise<boolean> {
  const sql = `DELETE FROM convenios WHERE id = ?`;
  const [result]: any = await pool.query(sql, [id]);
  return result && result.affectedRows > 0;
}
