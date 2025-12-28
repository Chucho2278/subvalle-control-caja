// backend/src/controllers/auth.controller.ts
import { Request, Response } from "express";
import { obtenerUsuarioPorEmail } from "../models/usuario.model";
import { signToken, TokenPayload } from "../utils/jwt";
import bcrypt from "bcrypt";
import { obtenerSucursalPorId } from "../models/sucursal.model";

/**
 * POST /api/auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, contraseña } = req.body as {
      email?: string;
      contraseña?: string;
    };

    if (!email || !contraseña) {
      return res
        .status(400)
        .json({ mensaje: "Email y contraseña son requeridos" });
    }

    // 1) Obtener usuario por email
    const user = await obtenerUsuarioPorEmail(email);
    if (!user) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    // 2) Verificar contraseña
    const match = await bcrypt.compare(contraseña, user.contraseña);
    if (!match) {
      return res.status(401).json({ mensaje: "Credenciales inválidas" });
    }

    // 3) Obtener nombre de sucursal si existe (para devolverlo al frontend)
    let sucursalNombre: string | null = null;
    if (user.sucursal_id != null) {
      try {
        const suc = await obtenerSucursalPorId(user.sucursal_id);
        if (suc && typeof suc.nombre === "string") {
          sucursalNombre = suc.nombre;
        }
      } catch (err) {
        console.warn("No se pudo obtener nombre de sucursal:", err);
        sucursalNombre = null;
      }
    }

    // 4) Generar token JWT incluyendo sucursal_id y (opcional) el nombre
    //    (si tu utils/jwt espera un TokenPayload estricto, esto añade el campo como opcional)
    const payload: TokenPayload & { sucursal_nombre?: string | null } = {
      userId: user.id!,
      rol: user.rol,
      sucursal_id: user.sucursal_id ?? null,
      sucursal_nombre: sucursalNombre ?? null,
    };
    const token = signToken(payload);

    // 5) Responder con token y datos mínimos (incluye 'restaurante' = nombre sucursal)
    return res.json({
      token,
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
      sucursal_id: user.sucursal_id ?? null,
      restaurante: sucursalNombre ?? null, // <-- campo para el frontend (nombre)
    });
  } catch (error: any) {
    console.error("Error en login:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno", detalle: error.message || error });
  }
};
