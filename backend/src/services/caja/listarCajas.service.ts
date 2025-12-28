// src/services/caja/listarCajas.service.ts
import { Response } from "express";
import { pool } from "../../utils/db";
import { maxToDateForFrom } from "../../utils/caja/fechas";
import { AuthRequest } from "../../types/auth.types";

/* -------------------- GET /api/caja -------------------- */
export const listarCajasService = async (req: AuthRequest, res: Response) => {
  try {
    // fechas
    const fecha = String(req.query.fecha ?? "").trim();
    const from = String(req.query.from ?? "").trim();
    const to = String(req.query.to ?? "").trim();

    // restaurante (opcional)
    const restauranteQ = req.query.restaurante
      ? String(req.query.restaurante)
      : null;

    // parsear turnos
    const rawTurno = req.query.turno;
    let turnos: string[] = [];

    if (Array.isArray(rawTurno)) {
      turnos = rawTurno
        .map(String)
        .flatMap((s) => s.split(","))
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (typeof rawTurno === "string" && rawTurno.trim() !== "") {
      turnos = rawTurno
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // parsear sucursales
    const rawSuc = req.query.sucursal_ids ?? req.query.sucursal_id;
    let sucursalIds: number[] = [];

    if (Array.isArray(rawSuc)) {
      sucursalIds = rawSuc
        .flatMap((x) => String(x).split(","))
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
    } else if (typeof rawSuc === "string" && rawSuc.trim() !== "") {
      sucursalIds = rawSuc
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => !Number.isNaN(n));
    } else if (typeof rawSuc === "number") {
      sucursalIds = [rawSuc];
    }

    // validación fechas
    const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
    let fechaFrom = "";
    let fechaTo = "";

    if (from && to) {
      if (!isoRegex.test(from) || !isoRegex.test(to)) {
        return res
          .status(400)
          .json({ mensaje: "Fechas inválidas. Use YYYY-MM-DD" });
      }
      fechaFrom = from;
      fechaTo = to;
    } else if (fecha) {
      if (!isoRegex.test(fecha)) {
        return res
          .status(400)
          .json({ mensaje: "Fecha inválida. Use YYYY-MM-DD" });
      }
      fechaFrom = fecha;
      fechaTo = fecha;
    } else {
      const hoy = new Date();
      const ayer = new Date(hoy);
      ayer.setDate(hoy.getDate() - 1);
      fechaFrom = ayer.toISOString().slice(0, 10);
      fechaTo = hoy.toISOString().slice(0, 10);
    }

    if (from && to) {
      const maxTo = maxToDateForFrom(fechaFrom);
      if (fechaTo > maxTo) {
        return res.status(400).json({
          mensaje: `Rango mayor a 3 meses. Fecha máxima permitida: ${maxTo}`,
        });
      }
    }

    const user = req.user ?? null;
    const role = (user?.rol ?? user?.role) as
      | "cajero"
      | "administrador"
      | undefined;

    let restaurante = restauranteQ;
    let forcedSucursalId: number | null = null;

    if (role === "cajero") {
      if (typeof user?.restaurante === "string") restaurante = user.restaurante;
      else if (typeof user?.sucursal_id === "number")
        forcedSucursalId = user.sucursal_id;
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Number(req.query.limit ?? 50));
    const offset = (page - 1) * limit;

    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (restaurante) {
      condiciones.push("restaurante = ?");
      params.push(restaurante);
    }

    if (!restaurante) {
      if (forcedSucursalId) {
        condiciones.push("sucursal_id = ?");
        params.push(forcedSucursalId);
      } else if (sucursalIds.length === 1) {
        condiciones.push("sucursal_id = ?");
        params.push(sucursalIds[0]);
      } else if (sucursalIds.length > 1) {
        condiciones.push(
          `sucursal_id IN (${sucursalIds.map(() => "?").join(",")})`
        );
        params.push(...sucursalIds);
      }
    }

    if (turnos.length === 1) {
      condiciones.push("turno = ?");
      params.push(turnos[0]);
    } else if (turnos.length > 1) {
      condiciones.push(`turno IN (${turnos.map(() => "?").join(",")})`);
      params.push(...turnos);
    }

    if (fechaFrom === fechaTo) {
      condiciones.push("DATE(fecha_registro) = ?");
      params.push(fechaFrom);
    } else {
      condiciones.push("DATE(fecha_registro) BETWEEN ? AND ?");
      params.push(fechaFrom, fechaTo);
    }

    const where = condiciones.length
      ? " WHERE " + condiciones.join(" AND ")
      : "";

    const sql = `
      SELECT *
      FROM registro_caja
      ${where}
      ORDER BY fecha_registro DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = (await pool.query(sql, [...params, limit, offset])) as any;

    const countSql = `
      SELECT COUNT(*) as total
      FROM registro_caja
      ${where}
    `;

    const [countRows] = (await pool.query(countSql, params)) as any;
    const total = Number(countRows?.[0]?.total ?? 0);

    return res.json({ page, limit, total, registros: rows ?? [] });
  } catch (error: any) {
    console.error("Error listando registros:", error);
    return res.status(500).json({
      mensaje: "Error interno al obtener registros",
      detalle: error?.message ?? String(error),
    });
  }
};
