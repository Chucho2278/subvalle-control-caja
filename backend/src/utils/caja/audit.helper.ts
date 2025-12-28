// src/utils/audit.helper.ts
import type { Request } from "express";
import { addAudit } from "../auditorias";

export function auditSafe(
  req: Request,
  payload: {
    accion: string;
    recurso?: string | null;
    recurso_id?: number | null;
    detalle?: unknown;
  }
) {
  const anyReq = req as any;
  if (!anyReq.user) return;

  void addAudit(anyReq, {
    ...payload,
    detalle:
      payload.detalle == null
        ? null
        : typeof payload.detalle === "string"
        ? payload.detalle
        : JSON.stringify(payload.detalle),
  });
}
