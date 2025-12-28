// backend/src/controllers/caja.metricas.controller.ts
import { Request, Response } from "express";
import { obtenerMetricasDesgloseVentas } from "../models/caja.metricas.model";

function parseSucursalParam(s: any): number[] | null {
  if (!s) return null;
  if (Array.isArray(s)) {
    const arr = s.map(Number).filter(Boolean);
    return arr.length ? arr : null;
  }
  if (typeof s === "string") {
    // can be "1,2,3" or "[]" or "null"
    if (s.trim() === "[]") return null;
    if (s.trim().toLowerCase() === "null") return null;
    const parts = s
      .split(",")
      .map((p) => Number(p))
      .filter(Boolean);
    return parts.length ? parts : null;
  }
  return null;
}

export async function metricasDesgloseVentas(req: Request, res: Response) {
  try {
    const { from, to } = req.query as Record<string, string>;
    const sucursalesRaw = (req.query as any).sucursales;

    if (!from || !to) {
      return res.status(400).json({ message: "from y to son requeridos" });
    }

    const sucursalIds = parseSucursalParam(sucursalesRaw);

    console.log("[metricas] params:", { from, to, sucursalIds });

    const metricas = await obtenerMetricasDesgloseVentas(from, to, sucursalIds);

    console.log("[metricas] result:", metricas);

    return res.json(metricas);
  } catch (error) {
    console.error("[metricas] error:", error);
    return res.status(500).json({ message: "Error al obtener métricas" });
  }
}
