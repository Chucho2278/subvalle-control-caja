//src/services/caja/obtenerCaja.service.ts
import { Response } from "express";
import { AuthRequest } from "../../types/auth.types";
import { obtenerRegistroPorId } from "../../models/caja.model";
import { obtenerConveniosPorRegistroId } from "../../models/registroConvenio.model";

/*
  GET /api/caja/:id
  ❌ No se auditan acciones de lectura (READ)
*/
export const obtenerCajaPorIdService = async (
  req: AuthRequest,
  res: Response
) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ mensaje: "Id inválido" });
  }

  try {
    const registro = await obtenerRegistroPorId(id);

    if (!registro) {
      return res.status(404).json({ mensaje: "Registro no encontrado" });
    }

    const convenios = await obtenerConveniosPorRegistroId(id);

    // Normalizar fecha a ISO string
    const safeRegistro = {
      ...registro,
      fecha_registro:
        registro.fecha_registro instanceof Date
          ? registro.fecha_registro.toISOString()
          : registro.fecha_registro,
    };

    return res.json({
      registro: safeRegistro,
      convenios,
    });
  } catch (error: unknown) {
    console.error("Error obteniendo registro:", error);
    return res.status(500).json({
      mensaje: "Error interno al obtener registro",
      detalle:
        error && typeof error === "object" && "message" in error
          ? (error as any).message
          : String(error),
    });
  }
};
