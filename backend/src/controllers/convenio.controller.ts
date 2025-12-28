import { Request, Response } from "express";
import {
  crearConvenio,
  listarConvenios,
  obtenerConvenioPorId,
  actualizarConvenio,
  eliminarConvenio,
} from "../models/convenio.model";
import { addAudit } from "../utils/auditorias";

/**
 * Request extendido con user opcional
 */
type AuthRequest = Request & {
  user?: { id?: number | null } | null;
};

/** =========================
 *  POST /api/convenios  (admin)
 *  Crear convenio (CON auditoría)
 *  ========================= */
export const registerConvenio = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre } = req.body as { nombre?: string };

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({ mensaje: "Nombre de convenio requerido" });
    }

    const nombreLimpio = nombre.trim();
    const id = await crearConvenio({ nombre: nombreLimpio });

    await addAudit(req, {
      accion: "CREAR",
      recurso: "CONVENIO",
      recurso_id: typeof id === "number" ? id : null,
      detalle: JSON.stringify({
        creado: { nombre: nombreLimpio },
      }),
    });

    return res.status(201).json({ mensaje: "Convenio creado", id });
  } catch (error: any) {
    console.error("Error creando convenio:", error);

    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ mensaje: "Convenio ya existe" });
    }

    return res
      .status(500)
      .json({ mensaje: "Error interno", detalle: error.message || error });
  }
};

/** =========================
 *  GET /api/convenios
 *  (cajero y admin) – SIN auditoría
 *  ========================= */
export const listConvenios = async (_req: Request, res: Response) => {
  try {
    const rows = await listarConvenios();
    return res.json({ sucursales: null, convenios: rows });
  } catch (error: any) {
    console.error("Error listando convenios:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno", detalle: error.message || error });
  }
};

/** =========================
 *  GET /api/convenios/:id
 *  (cajero y admin) – SIN auditoría
 *  ========================= */
export const getConvenio = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: "Id inválido" });
    }

    const convenio = await obtenerConvenioPorId(id);

    if (!convenio) {
      return res.status(404).json({ mensaje: "Convenio no encontrado" });
    }

    return res.json({ convenio });
  } catch (error: any) {
    console.error("Error obteniendo convenio:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno", detalle: error.message || error });
  }
};

/** =========================
 *  PUT /api/convenios/:id  (admin)
 *  Actualizar convenio (CON auditoría)
 *  ========================= */
export const updateConvenio = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: "Id inválido" });
    }

    const { nombre } = req.body as { nombre?: string };

    if (!nombre || typeof nombre !== "string" || !nombre.trim()) {
      return res.status(400).json({ mensaje: "Nombre de convenio requerido" });
    }

    const nombreLimpio = nombre.trim();

    // 1️⃣ Estado ANTES
    const before = await obtenerConvenioPorId(id);
    if (!before) {
      return res.status(404).json({ mensaje: "Convenio no encontrado" });
    }

    // 2️⃣ Update
    const ok = await actualizarConvenio(id, { nombre: nombreLimpio });
    if (!ok) {
      return res
        .status(404)
        .json({ mensaje: "Convenio no encontrado o sin cambios" });
    }

    // 3️⃣ Estado DESPUÉS
    const after = await obtenerConvenioPorId(id);

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

    // 5️⃣ Auditoría solo si hay cambios reales
    if (Object.keys(cambios).length > 0) {
      await addAudit(req, {
        accion: "ACTUALIZAR",
        recurso: "CONVENIO",
        recurso_id: id,
        detalle: JSON.stringify({ cambios }),
      });
    }

    return res.json({ mensaje: "Convenio actualizado" });
  } catch (error: any) {
    console.error("Error actualizando convenio:", error);

    if (error && error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ mensaje: "Nombre de convenio ya existe" });
    }

    return res
      .status(500)
      .json({ mensaje: "Error interno", detalle: error.message || error });
  }
};

/** =========================
 *  DELETE /api/convenios/:id  (admin)
 *  Eliminar convenio (CON auditoría)
 *  ========================= */
export const deleteConvenio = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (!id || isNaN(id)) {
      return res.status(400).json({ mensaje: "Id inválido" });
    }

    // 1️⃣ Snapshot ANTES
    const convenio = await obtenerConvenioPorId(id);
    if (!convenio) {
      return res.status(404).json({ mensaje: "Convenio no encontrado" });
    }

    // 2️⃣ Delete
    const ok = await eliminarConvenio(id);
    if (!ok) {
      return res.status(404).json({ mensaje: "Convenio no encontrado" });
    }

    // 3️⃣ Auditoría
    await addAudit(req, {
      accion: "ELIMINAR",
      recurso: "CONVENIO",
      recurso_id: id,
      detalle: JSON.stringify({ eliminado: convenio }),
    });

    return res.json({ mensaje: "Convenio eliminado" });
  } catch (error: any) {
    console.error("Error eliminando convenio:", error);
    return res
      .status(500)
      .json({ mensaje: "Error interno", detalle: error.message || error });
  }
};
