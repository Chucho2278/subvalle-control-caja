import { Request, Response } from "express";
import {
  crearSucursal,
  obtenerSucursales,
  obtenerSucursalPorId,
  actualizarSucursal,
  eliminarSucursal,
  Sucursal,
} from "../models/sucursal.model";
import { addAudit } from "../utils/auditorias";

/**
 * Request extendido con user opcional
 */
type AuthRequest = Request & {
  user?: { id?: number | null } | null;
};

/** =========================
 *  POST /api/sucursal
 *  Crear sucursal (CON auditoría)
 *  ========================= */
export const registerSucursal = async (req: AuthRequest, res: Response) => {
  const data = req.body as Sucursal;

  try {
    const insertId = await crearSucursal(data);

    await addAudit(req, {
      accion: "CREAR",
      recurso: "SUCURSAL",
      recurso_id: typeof insertId === "number" ? insertId : null,
      detalle: JSON.stringify({
        creada: {
          nombre: data.nombre,
          direccion: data.direccion ?? null,
        },
      }),
    });

    return res.status(201).json({ mensaje: "Sucursal creada" });
  } catch (error: any) {
    console.error("Error creando sucursal:", error);
    return res.status(500).json({ mensaje: "Error interno al crear sucursal" });
  }
};

/** =========================
 *  GET /api/sucursal
 *  ========================= */
export const listSucursales = async (_req: Request, res: Response) => {
  try {
    const lista = await obtenerSucursales();
    return res.json({ sucursales: lista });
  } catch (error: any) {
    console.error("Error listando sucursales:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno al obtener sucursales" });
  }
};

/** =========================
 *  GET /api/sucursal/:id
 *  ========================= */
export const getSucursal = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    const sucursal = await obtenerSucursalPorId(id);

    if (!sucursal) {
      return res.status(404).json({ mensaje: "Sucursal no encontrada" });
    }

    return res.json({ sucursal });
  } catch (error: any) {
    console.error("Error obteniendo sucursal:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno al obtener sucursal" });
  }
};

/** =========================
 *  PUT /api/sucursal/:id
 *  Actualizar sucursal (CON auditoría)
 *  ========================= */
export const updateSucursal = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);
  const data = req.body as Sucursal;

  if (Number.isNaN(id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    // 1️⃣ Estado ANTES
    const before = await obtenerSucursalPorId(id);
    if (!before) {
      return res.status(404).json({ mensaje: "Sucursal no encontrada" });
    }

    // 2️⃣ Update
    await actualizarSucursal(id, data);

    // 3️⃣ Estado DESPUÉS
    const after = await obtenerSucursalPorId(id);

    // 4️⃣ Cambios
    const cambios: Record<string, { antes: any; despues: any }> = {};

    if (after) {
      for (const key of Object.keys(after)) {
        if ((before as any)[key] !== (after as any)[key]) {
          cambios[key] = {
            antes: (before as any)[key],
            despues: (after as any)[key],
          };
        }
      }
    }

    // 5️⃣ Auditoría solo si hay cambios
    if (Object.keys(cambios).length > 0) {
      await addAudit(req, {
        accion: "ACTUALIZAR",
        recurso: "SUCURSAL",
        recurso_id: id,
        detalle: JSON.stringify({ cambios }),
      });
    }

    return res.json({ mensaje: "Sucursal actualizada" });
  } catch (error: any) {
    console.error("Error actualizando sucursal:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno al actualizar sucursal" });
  }
};

/** =========================
 *  DELETE /api/sucursal/:id
 *  Eliminar sucursal (CON auditoría)
 *  ========================= */
export const deleteSucursal = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ mensaje: "ID inválido" });
  }

  try {
    // 1️⃣ Snapshot ANTES
    const sucursal = await obtenerSucursalPorId(id);
    if (!sucursal) {
      return res.status(404).json({ mensaje: "Sucursal no encontrada" });
    }

    // 2️⃣ Delete
    await eliminarSucursal(id);

    // 3️⃣ Auditoría
    await addAudit(req, {
      accion: "ELIMINAR",
      recurso: "SUCURSAL",
      recurso_id: id,
      detalle: JSON.stringify({ eliminada: sucursal }),
    });

    return res.json({ mensaje: "Sucursal eliminada" });
  } catch (error: any) {
    console.error("Error eliminando sucursal:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno al eliminar sucursal" });
  }
};
