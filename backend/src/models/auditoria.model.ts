import { pool } from "../utils/db";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

/* =========================
   TIPOS
========================= */

export type AuditoriaRow = {
  id: number;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  accion: string;
  recurso?: string | null;
  recurso_id?: number | null;
  detalle?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
};

export type AuditoriaFiltros = {
  usuario_id?: number;
  recurso?: string;
  accion?: string;
};

/* =========================
   INSERTAR AUDITORÍA
========================= */

export async function insertarAuditoria(a: {
  usuario_id?: number | null;
  accion: string;
  recurso?: string | null;
  recurso_id?: number | null;
  detalle?: string | null;
  ip?: string | null;
  user_agent?: string | null;
}): Promise<number> {
  const sql = `
    INSERT INTO auditorias
      (usuario_id, accion, recurso, recurso_id, detalle, ip, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    typeof a.usuario_id === "number" ? a.usuario_id : null,
    a.accion,
    a.recurso ?? null,
    typeof a.recurso_id === "number" ? a.recurso_id : null,
    a.detalle ?? null,
    a.ip ?? null,
    a.user_agent ?? null,
  ];

  const [result] = (await pool.query(sql, params)) as ResultSetHeader[];

  return Number(result.insertId);
}

/* =========================
   LISTAR AUDITORÍAS (FILTROS + PAGINACIÓN)
========================= */

export async function listarAuditoriasDb(
  page = 1,
  limit = 10,
  filtros: AuditoriaFiltros = {}
): Promise<{ auditorias: AuditoriaRow[]; total: number }> {
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (typeof filtros.usuario_id === "number") {
    where.push("a.usuario_id = ?");
    params.push(filtros.usuario_id);
  }

  if (filtros.recurso) {
    where.push("a.recurso LIKE ?");
    params.push(`%${filtros.recurso}%`);
  }

  if (filtros.accion) {
    where.push("a.accion = ?");
    params.push(filtros.accion);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  /* ---- TOTAL ---- */
  const sqlTotal = `
    SELECT COUNT(*) AS total
    FROM auditorias a
    ${whereSql}
  `;

  const [totalRows] = (await pool.query(sqlTotal, params)) as RowDataPacket[];

  const total = Number(totalRows[0]?.total ?? 0);

  /* ---- DATOS ---- */
  const sqlData = `
    SELECT
      a.id,
      a.usuario_id,
      u.nombre AS usuario_nombre,
      a.accion,
      a.recurso,
      a.recurso_id,
      a.detalle,
      a.ip,
      a.user_agent,
      a.created_at
    FROM auditorias a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ${whereSql}
    ORDER BY a.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = (await pool.query(sqlData, [
    ...params,
    limit,
    offset,
  ])) as RowDataPacket[];

  const auditorias: AuditoriaRow[] = rows.map(
    (r: RowDataPacket): AuditoriaRow => ({
      id: Number(r.id),
      usuario_id: r.usuario_id ? Number(r.usuario_id) : null,
      usuario_nombre: r.usuario_nombre ? String(r.usuario_nombre) : null,
      accion: String(r.accion),
      recurso: r.recurso ?? null,
      recurso_id: r.recurso_id ? Number(r.recurso_id) : null,
      detalle: r.detalle ?? null,
      ip: r.ip ?? null,
      user_agent: r.user_agent ?? null,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
    })
  );

  return { auditorias, total };
}

/* =========================
   OBTENER ACCIONES ÚNICAS
========================= */

export async function obtenerAccionesAuditoriaDb(): Promise<string[]> {
  const sql = `
    SELECT DISTINCT accion
    FROM auditorias
    WHERE accion IS NOT NULL
    ORDER BY accion ASC
  `;

  const [rows] = (await pool.query(sql)) as RowDataPacket[];

  return rows.map((r: RowDataPacket) => String(r.accion));
}
