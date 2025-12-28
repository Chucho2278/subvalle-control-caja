import { Request, Response } from "express";
import {
  listarAuditoriasDb,
  obtenerAccionesAuditoriaDb,
} from "../models/auditoria.model";

/* =========================
   LISTAR AUDITORÍAS
   (FILTROS + PAGINACIÓN)
========================= */
export const listarAuditorias = async (req: Request, res: Response) => {
  try {
    /* ---- paginación segura ---- */
    const page =
      typeof req.query.page === "string" && !isNaN(Number(req.query.page))
        ? Number(req.query.page)
        : 1;

    const limit =
      typeof req.query.limit === "string" && !isNaN(Number(req.query.limit))
        ? Number(req.query.limit)
        : 10;

    /* ---- filtros ---- */
    const usuario_id =
      typeof req.query.usuario_id === "string" &&
      !isNaN(Number(req.query.usuario_id))
        ? Number(req.query.usuario_id)
        : undefined;

    const recurso =
      typeof req.query.recurso === "string" && req.query.recurso.trim() !== ""
        ? req.query.recurso.trim()
        : undefined;

    const accion =
      typeof req.query.accion === "string" && req.query.accion.trim() !== ""
        ? req.query.accion.trim()
        : undefined;

    /* ---- llamada al modelo ---- */
    const { auditorias, total } = await listarAuditoriasDb(page, limit, {
      usuario_id,
      recurso,
      accion,
    });

    return res.json({
      auditorias,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error listando auditorías:", error);
    return res.status(500).json({
      mensaje: "Error interno al obtener auditorías",
    });
  }
};

/* =========================
   OBTENER ACCIONES ÚNICAS
   (PARA SELECT DEL FRONTEND)
========================= */
export const obtenerAccionesAuditoria = async (
  _req: Request,
  res: Response
) => {
  try {
    const acciones = await obtenerAccionesAuditoriaDb();
    return res.json({ acciones });
  } catch (error) {
    console.error("Error obteniendo acciones auditoría:", error);
    return res.status(500).json({
      mensaje: "Error interno al obtener acciones",
    });
  }
};
