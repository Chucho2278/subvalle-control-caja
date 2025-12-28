// backend/src/utils/auditorias.ts
import type { Request } from "express";
import { insertarAuditoria } from "../models/auditoria.model";

export interface AuditPayload {
  accion: string;
  recurso?: string | null;
  recurso_id?: number | null;
  detalle?: string | null;
}

/** petición extendida con user opcional (solo usamos user?.id) */
type AuthRequest = Request & { user?: { id?: number | null } | null };

/**
 * Registra una auditoría de forma segura.
 * Devuelve insertId (number) o 0 si ocurre un error (no lanza excepción).
 */
export async function addAudit(
  req: AuthRequest,
  payload: AuditPayload
): Promise<number> {
  // usuarioId seguro
  const usuarioId =
    typeof req.user?.id === "number" ? Number(req.user.id) : null;

  // headers: definimos tipo explícito para evitar warnings de nullable
  const headers = (req.headers ?? {}) as Record<
    string,
    string | string[] | undefined
  >;

  // extraer IP (x-forwarded-for -> primera entrada) con guardas de tipo
  const xff = headers["x-forwarded-for"];
  let ip: string | null = null;

  if (typeof xff === "string") {
    const trimmed = xff.trim();
    if (trimmed !== "") {
      const first = trimmed.split(",")[0]?.trim();
      if (first) ip = first;
    }
  } else if (
    Array.isArray(xff) &&
    xff.length > 0 &&
    typeof xff[0] === "string"
  ) {
    const candidate = (xff[0] ?? "").trim();
    if (candidate !== "") {
      const first = candidate.split(",")[0]?.trim();
      if (first) ip = first;
    }
  } else if (typeof req.ip === "string" && req.ip.trim() !== "") {
    // fallback a req.ip
    ip = req.ip.trim();
  }

  // extraer user-agent de forma segura
  const ua = headers["user-agent"];
  let userAgent: string | null = null;
  if (typeof ua === "string") {
    const t = ua.trim();
    if (t !== "") userAgent = t;
  } else if (Array.isArray(ua) && ua.length > 0 && typeof ua[0] === "string") {
    const t = (ua[0] ?? "").trim();
    if (t !== "") userAgent = t;
  }

  try {
    const insertId = await insertarAuditoria({
      usuario_id: usuarioId ?? null,
      accion: payload.accion,
      recurso: payload.recurso ?? null,
      recurso_id: payload.recurso_id ?? null,
      detalle: payload.detalle ?? null,
      ip,
      user_agent: userAgent,
    });

    return typeof insertId === "number" ? insertId : 0;
  } catch (err) {
    // No queremos que una falla de auditoría rompa la operación principal
    // eslint-disable-next-line no-console
    console.error("Error registrando auditoría:", err);
    return 0;
  }
}
