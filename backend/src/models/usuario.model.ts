// backend/src/models/usuario.model.ts
import { pool } from "../utils/db";
import bcrypt from "bcrypt";

export interface Usuario {
  id?: number;
  nombre: string;
  email: string;
  contraseña: string; // aquí guardamos el hash
  rol: "cajero" | "administrador";
  sucursal_id?: number | null;
}

/** Usuario extendido con nombre de sucursal */
export interface UsuarioConSucursal extends Usuario {
  sucursal_nombre?: string | null;
}

/**
 * Crear un usuario (hash de contraseña incluido)
 */
export async function crearUsuario(user: Omit<Usuario, "id">): Promise<void> {
  const saltRounds = 10;
  const hash = await bcrypt.hash(user.contraseña, saltRounds);

  const sql = `
    INSERT INTO usuarios (nombre, email, contraseña, rol, sucursal_id)
    VALUES (?, ?, ?, ?, ?)
  `;
  await pool.query(sql, [
    user.nombre,
    user.email,
    hash,
    user.rol,
    user.sucursal_id ?? null,
  ]);
}

/**
 * Buscar usuario por email (devuelve campo contraseña hashed).
 * Ahora también intenta traer el nombre de la sucursal (sucursal_nombre).
 */
export async function obtenerUsuarioPorEmail(
  email: string
): Promise<UsuarioConSucursal | null> {
  const sql = `
    SELECT 
      u.id, u.nombre, u.email, u.contraseña, u.rol, u.sucursal_id,
      s.nombre AS sucursal_nombre
    FROM usuarios u
    LEFT JOIN sucursales s ON u.sucursal_id = s.id
    WHERE u.email = ?
    LIMIT 1
  `;
  const [rows]: any = await pool.query(sql, [email]);
  return rows.length ? (rows[0] as UsuarioConSucursal) : null;
}

/**
 * Buscar usuario por id
 */
export async function obtenerUsuarioPorId(id: number): Promise<Usuario | null> {
  const sql = `SELECT id, nombre, email, contraseña, rol, sucursal_id FROM usuarios WHERE id = ?`;
  const [rows]: any = await pool.query(sql, [id]);
  return rows.length ? (rows[0] as Usuario) : null;
}

/**
 * Asignar o actualizar la sucursal de un usuario
 */
export async function asignarSucursalAUsuario(
  userId: number,
  sucursalId: number | null
): Promise<void> {
  const sql = `UPDATE usuarios SET sucursal_id = ? WHERE id = ?`;
  await pool.query(sql, [sucursalId, userId]);
}

/**
 * Eliminar un usuario por id. Devuelve true si eliminó, false si no existía
 */
export async function eliminarUsuario(id: number): Promise<boolean> {
  const sql = `DELETE FROM usuarios WHERE id = ?`;
  const [result]: any = await pool.query(sql, [id]);
  return result && result.affectedRows > 0;
}

/**
 * Actualizar usuario parcialmente.
 * Si se proporciona 'contraseña', la hashea.
 * Devuelve true si se actualizó, false si no existe.
 */
export async function actualizarUsuario(
  id: number,
  cambios: Partial<Omit<Usuario, "id">>
): Promise<boolean> {
  const campos: string[] = [];
  const valores: any[] = [];

  if (cambios.nombre !== undefined) {
    campos.push("nombre = ?");
    valores.push(cambios.nombre);
  }
  if (cambios.email !== undefined) {
    campos.push("email = ?");
    valores.push(cambios.email);
  }
  if (cambios.rol !== undefined) {
    campos.push("rol = ?");
    valores.push(cambios.rol);
  }
  if (cambios.sucursal_id !== undefined) {
    campos.push("sucursal_id = ?");
    valores.push(cambios.sucursal_id ?? null);
  }
  if (cambios.contraseña !== undefined) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(cambios.contraseña, saltRounds);
    campos.push("contraseña = ?");
    valores.push(hash);
  }

  if (campos.length === 0) {
    return false;
  }

  const sql = `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`;
  valores.push(id);

  const [result]: any = await pool.query(sql, valores);
  return result && result.affectedRows > 0;
}

/**
 * Listar usuarios con nombre de sucursal (útil para UI admin)
 */
export async function listarUsuariosConSucursal(): Promise<any[]> {
  const sql = `
    SELECT u.id, u.nombre, u.email, u.rol, u.sucursal_id, s.nombre AS sucursal_nombre
    FROM usuarios u
    LEFT JOIN sucursales s ON u.sucursal_id = s.id
    ORDER BY u.nombre
  `;
  const [rows]: any = await pool.query(sql);
  return rows;
}
