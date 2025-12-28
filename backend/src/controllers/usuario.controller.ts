// backend/src/controllers/usuarios.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { pool } from "../utils/db";
import { AuthRequest } from "../types/express-request";
import { auditSafe } from "../utils/caja/audit.helper";

/**
 * Crear usuario
 * (usa Request normal — auditSafe solo registrará si hay req.user)
 */
export const crearUsuarioController = async (req: Request, res: Response) => {
  try {
    const { nombre, email, contraseña, rol, sucursal_id } = req.body;

    if (!nombre || !email || !contraseña || !rol) {
      return res.status(400).json({ mensaje: "Datos incompletos" });
    }

    const hash = await bcrypt.hash(contraseña, 10);

    const [result]: any = await pool.query(
      `INSERT INTO usuarios (nombre, email, contraseña, rol, sucursal_id)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre, email, hash, rol, sucursal_id ?? null]
    );

    const insertId = result.insertId ?? null;

    // Auditoría: CREAR USUARIO (auditSafe ignora si no hay req.user)
    auditSafe(req, {
      accion: "CREAR",
      recurso: "USUARIO",
      recurso_id: insertId,
      detalle: { nombre, email, rol, sucursal_id: sucursal_id ?? null },
    });

    return res.status(201).json({
      mensaje: "Usuario creado correctamente",
      id: insertId,
    });
  } catch (error: any) {
    console.error("crearUsuarioController:", error);
    // Manejar duplicados por email (opcional)
    if (error?.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ mensaje: "Email ya registrado" });
    }
    return res.status(500).json({ mensaje: "Error creando usuario" });
  }
};

/**
 * Listar usuarios (SIN contraseña)
 */
export const listarUsuariosController = async (
  _req: Request,
  res: Response
) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, sucursal_id
       FROM usuarios`
    );
    return res.json({ usuarios: rows });
  } catch (error) {
    console.error("listarUsuariosController:", error);
    return res.status(500).json({ mensaje: "Error listando usuarios" });
  }
};

/**
 * Obtener usuario por ID (SIN contraseña)
 */
export const getUsuarioController = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    const [rows] = await pool.query(
      `SELECT id, nombre, email, rol, sucursal_id
       FROM usuarios
       WHERE id = ?`,
      [id]
    );

    const usuarios = rows as any[];
    if (!usuarios.length) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    return res.json({ usuario: usuarios[0] });
  } catch (error) {
    console.error("getUsuarioController:", error);
    return res.status(500).json({ mensaje: "Error obteniendo usuario" });
  }
};

/**
 * Actualizar usuario
 * (USA req.user → AuthRequest)
 */
export const actualizarUsuarioController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    /* 1️⃣ Estado ANTES */
    const [beforeRows]: any = await pool.query(
      "SELECT nombre, email, rol, sucursal_id FROM usuarios WHERE id = ?",
      [id]
    );
    const before = (beforeRows as any[])[0];
    if (!before) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    const { nombre, email, contraseña, rol, sucursal_id } = req.body;

    const campos: string[] = [];
    const valores: unknown[] = [];

    if (nombre) {
      campos.push("nombre = ?");
      valores.push(nombre);
    }

    if (email) {
      campos.push("email = ?");
      valores.push(email);
    }

    if (contraseña) {
      const hash = await bcrypt.hash(contraseña, 10);
      campos.push("contraseña = ?");
      valores.push(hash);
    }

    if (rol) {
      campos.push("rol = ?");
      valores.push(rol);
    }

    if (sucursal_id !== undefined) {
      campos.push("sucursal_id = ?");
      valores.push(sucursal_id ?? null);
    }

    if (!campos.length) {
      return res.status(400).json({ mensaje: "Nada para actualizar" });
    }

    valores.push(id);

    /* 2️⃣ UPDATE */
    await pool.query(
      `UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`,
      valores
    );

    /* 3️⃣ Estado DESPUÉS */
    const [afterRows]: any = await pool.query(
      "SELECT nombre, email, rol, sucursal_id FROM usuarios WHERE id = ?",
      [id]
    );
    const after = (afterRows as any[])[0];

    /* 4️⃣ Construir cambios */
    const cambios: Record<string, { antes: any; despues: any }> = {};
    for (const key of Object.keys(after)) {
      if (before[key] !== after[key]) {
        cambios[key] = {
          antes: before[key],
          despues: after[key],
        };
      }
    }

    /* 5️⃣ Guardar auditoría (si hay cambios) usando auditSafe */
    if (Object.keys(cambios).length > 0) {
      await auditSafe(req, {
        accion: "ACTUALIZAR",
        recurso: "USUARIO",
        recurso_id: id,
        detalle: { cambios },
      });
    }

    return res.json({ mensaje: "Usuario actualizado correctamente" });
  } catch (error) {
    console.error("actualizarUsuarioController:", error);
    return res.status(500).json({ mensaje: "Error actualizando usuario" });
  }
};

/**
 * Asignar sucursal a usuario
 * (Request normal; auditSafe guardará si hay req.user)
 */
export const asignarSucursalController = async (
  req: Request,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    const { sucursal_id } = req.body;

    if (Number.isNaN(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    // obtener estado ANTES para auditoría
    const [beforeRows]: any = await pool.query(
      "SELECT id, sucursal_id FROM usuarios WHERE id = ?",
      [id]
    );
    const before = (beforeRows as any[])[0];
    if (!before) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    await pool.query(`UPDATE usuarios SET sucursal_id = ? WHERE id = ?`, [
      sucursal_id ?? null,
      id,
    ]);

    // auditoría: detalle con antes/después
    auditSafe(req, {
      accion: "ASIGNAR_SUCURSAL",
      recurso: "USUARIO",
      recurso_id: id,
      detalle: {
        antes: { sucursal_id: before.sucursal_id ?? null },
        despues: { sucursal_id: sucursal_id ?? null },
      },
    });

    return res.json({ mensaje: "Sucursal asignada correctamente" });
  } catch (error) {
    console.error("asignarSucursalController:", error);
    return res.status(500).json({ mensaje: "Error asignando sucursal" });
  }
};

/**
 * Eliminar usuario (CON auditoría)
 */
export const eliminarUsuarioController = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ mensaje: "ID inválido" });
    }

    // 1️⃣ Obtener estado ANTES (snapshot)
    const [rows]: any = await pool.query(
      `SELECT id, nombre, email, rol, sucursal_id
       FROM usuarios
       WHERE id = ?`,
      [id]
    );
    const usuario = (rows as any[])[0];
    if (!usuario) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // 2️⃣ Eliminar usuario
    await pool.query(`DELETE FROM usuarios WHERE id = ?`, [id]);

    // 3️⃣ Registrar auditoría usando auditSafe
    await auditSafe(req, {
      accion: "ELIMINAR",
      recurso: "USUARIO",
      recurso_id: id,
      detalle: { eliminado: usuario },
    });

    return res.json({ mensaje: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("eliminarUsuarioController:", error);
    return res.status(500).json({ mensaje: "Error eliminando usuario" });
  }
};
