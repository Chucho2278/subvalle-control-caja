import { Response, NextFunction } from "express";
import { insertarAuditoria } from "../models/auditoria.model";
import { AuthRequest } from "../types/express-request";

export function auditAction(accion: string, recurso?: string) {
  return (req: any, res: Response, next: NextFunction) => {
    const originalJson = res.json.bind(res);

    res.json = (body: any) => {
      try {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          insertarAuditoria({
            usuario_id: req.user?.id ?? null,
            accion,
            recurso: recurso ?? null,
            recurso_id: req.params.id
              ? Number(req.params.id)
              : body?.id ?? null,
            detalle: `${req.method} ${req.originalUrl}`,
            ip: req.ip,
            user_agent: req.headers["user-agent"] ?? null,
          }).catch(console.error);
        }
      } catch (err) {
        console.error("Error auditoría:", err);
      }

      return originalJson(body);
    };

    next();
  };
}
