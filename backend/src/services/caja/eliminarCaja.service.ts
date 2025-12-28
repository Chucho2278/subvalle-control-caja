//src/services/caja/eliminarCaja.service.ts
import { Response } from "express";
import { AuthRequest } from "../../types/auth.types";
import { eliminarRegistroCaja } from "../../models/caja.model";
import { addAudit } from "../../utils/auditorias";

/*
  DELETE /api/caja/:id
  ✅ Se audita acción de eliminación
*/
export const eliminarCajaService = async (req: AuthRequest, res: Response) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ mensaje: "Id inválido" });
  }

  try {
    const ok = await eliminarRegistroCaja(id);

    if (!ok) {
      return res.status(404).json({ mensaje: "Registro no encontrado" });
    }

    // Auditoría (no bloqueante)
    void addAudit(req, {
      accion: "eliminar_registro",
      recurso: "registro_caja",
      recurso_id: id,
      detalle: null,
    }).catch(() => {});

    return res.json({
      mensaje: "Registro eliminado correctamente",
      id,
    });
  } catch (error: unknown) {
    console.error("Error eliminando registro:", error);
    return res.status(500).json({
      mensaje: "Error interno al eliminar registro",
      detalle:
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : String(error),
    });
  }
};
