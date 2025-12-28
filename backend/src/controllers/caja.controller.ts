// backend/src/controllers/caja.controller.ts
import { Response } from "express";
import ExcelJS from "exceljs";

import { AuthRequest } from "../types/auth.types";

/* ===========================
   SERVICES (delegación)
   =========================== */
import { registrarCajaService } from "../services/caja/registrarCaja.service";
import { listarCajasService } from "../services/caja/listarCajas.service";
import { obtenerCajaPorIdService } from "../services/caja/obtenerCaja.service";
import { actualizarCajaParcialService } from "../services/caja/actualizarCaja.service";
import { eliminarCajaService } from "../services/caja/eliminarCaja.service";
import { obtenerResumenTurnosService } from "../services/caja/resumenTurnos.service";
import { exportarExcelService } from "../services/caja/exportarExcel.service";

/* Servicios adicionales para descuadres (implementarlos en services/caja/descuadres.service.ts) */
import {
  obtenerTopDescuadresService,
  obtenerRegistrosParaCajeros,
} from "../services/caja/descuadres.service";

/* ===========================
   Utilidades locales
   =========================== */
import { maxToDateForFrom } from "../utils/caja/fechas";

/** parsear sucursal ids (csv | array | number) -> number[] | null */
function parseSucursalIds(raw: unknown): number[] | null {
  if (Array.isArray(raw)) {
    return (raw as unknown[])
      .flatMap((x) => String(x).split(","))
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    return [Number(raw)];
  }
  return null;
}

function isIsoYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? ""));
}

/* =====================================================
   POST /api/caja/registrar
   ===================================================== */
export const registrarCaja = async (req: AuthRequest, res: Response) => {
  return registrarCajaService(req, res);
};

/* =====================================================
   GET /api/caja
   ===================================================== */
export const listarCajas = async (req: AuthRequest, res: Response) => {
  return listarCajasService(req, res);
};

/* =====================================================
   GET /api/caja/:id
   ===================================================== */
export const obtenerCajaPorId = async (req: AuthRequest, res: Response) => {
  return obtenerCajaPorIdService(req, res);
};

/* =====================================================
   PATCH /api/caja/:id
   ===================================================== */
export const actualizarCajaParcial = async (
  req: AuthRequest,
  res: Response
) => {
  return actualizarCajaParcialService(req, res);
};

/* =====================================================
   DELETE /api/caja/:id
   ===================================================== */
export const eliminarCaja = async (req: AuthRequest, res: Response) => {
  return eliminarCajaService(req, res);
};

/* =====================================================
   GET /api/caja/resumen  (resumen por turnos - JSON)
   Query params: from, to, restaurante?, sucursal_id?
   ===================================================== */
export const obtenerResumenTurnos = async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, restaurante, sucursal_id } = req.query as Record<
      string,
      string | undefined
    >;

    if (!from || !to) {
      return res.status(400).json({
        mensaje: "Debe enviar parámetros from y to (YYYY-MM-DD)",
      });
    }

    if (!isIsoYmd(from) || !isIsoYmd(to)) {
      return res
        .status(400)
        .json({ mensaje: "Formato de fecha inválido. Use YYYY-MM-DD" });
    }

    const maxTo = maxToDateForFrom(from);
    if (to > maxTo) {
      return res.status(400).json({
        mensaje: `Rango mayor a 3 meses. Fecha máxima permitida para 'to' es ${maxTo}`,
      });
    }

    const resumen = await obtenerResumenTurnosService(
      from,
      to,
      restaurante ?? null,
      sucursal_id ? Number(sucursal_id) : null
    );

    return res.json({
      from,
      to,
      ...resumen,
    });
  } catch (error: any) {
    console.error("Error obteniendo resumen:", error);
    return res.status(500).json({
      mensaje: "Error interno obteniendo resumen",
      detalle: error?.message ?? String(error),
    });
  }
};

/* =====================================================
   GET /api/caja/exportar/excel
   ===================================================== */
export const exportarResumenExcel = async (req: AuthRequest, res: Response) => {
  try {
    return await exportarExcelService(req, res);
  } catch (error: any) {
    console.error("Error exportando Excel:", error);
    return res.status(500).json({
      mensaje: "Error interno exportando Excel",
      detalle: error?.message ?? String(error),
    });
  }
};

/* =====================================================
   GET /api/caja/descuadres/top
   - top de cajeros con más faltantes/sobrantes
   Query: from, to, restaurante?, sucursal_ids?, limit?
   ===================================================== */
export const obtenerTopDescuadres = async (req: AuthRequest, res: Response) => {
  try {
    const raw = req.query as Record<string, string | undefined>;
    const from = String(raw.from ?? "").trim();
    const to = String(raw.to ?? "").trim();
    const restaurante =
      typeof raw.restaurante === "string" ? raw.restaurante : null;
    const limit = raw.limit
      ? Math.max(1, Math.min(100, Number(raw.limit)))
      : 10;

    if (!from || !to) {
      return res.status(400).json({
        mensaje: "Debe enviar parámetros from y to (YYYY-MM-DD)",
      });
    }
    if (!isIsoYmd(from) || !isIsoYmd(to)) {
      return res
        .status(400)
        .json({ mensaje: "Formato de fecha inválido. Use YYYY-MM-DD" });
    }
    const maxTo = maxToDateForFrom(from);
    if (to > maxTo) {
      return res.status(400).json({
        mensaje: `Rango mayor a 3 meses. Fecha máxima permitida para 'to' es ${maxTo}`,
      });
    }

    const sucursalIds = parseSucursalIds(
      req.query.sucursal_ids ?? req.query.sucursal_id
    );

    const topResult = await obtenerTopDescuadresService(
      from,
      to,
      restaurante,
      sucursalIds,
      limit
    );

    const faltantes: any[] = Array.isArray(topResult?.faltantes)
      ? topResult.faltantes
      : [];
    const sobrantes: any[] = Array.isArray(topResult?.sobrantes)
      ? topResult.sobrantes
      : [];

    // usar for..of para evitar avisos de TS sobre posible null
    const faltantesOut: any[] = [];
    for (const f of faltantes) {
      faltantesOut.push(f);
    }
    const sobrantesOut: any[] = [];
    for (const s of sobrantes) {
      sobrantesOut.push(s);
    }

    return res.json({
      from,
      to,
      faltantes: faltantesOut,
      sobrantes: sobrantesOut,
    });
  } catch (error: any) {
    console.error("Error obteniendo top descuadres:", error);
    return res.status(500).json({
      mensaje: "Error interno al obtener top de descuadres",
      detalle: error?.message ?? String(error),
    });
  }
};

/* =====================================================
   GET /api/caja/descuadres/export
   - exporta Excel con el top y hojas por cajero
   ===================================================== */
export const exportarTopDescuadresExcel = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const raw = req.query as Record<string, string | undefined>;
    const from = String(raw.from ?? "").trim();
    const to = String(raw.to ?? "").trim();
    const restaurante =
      typeof raw.restaurante === "string" ? raw.restaurante : null;
    const limit = raw.limit
      ? Math.max(1, Math.min(100, Number(raw.limit)))
      : 10;

    if (!from || !to) {
      return res.status(400).json({
        mensaje: "Debe enviar parámetros from y to (YYYY-MM-DD)",
      });
    }
    if (!isIsoYmd(from) || !isIsoYmd(to)) {
      return res
        .status(400)
        .json({ mensaje: "Formato de fecha inválido. Use YYYY-MM-DD" });
    }
    const maxTo = maxToDateForFrom(from);
    if (to > maxTo) {
      return res.status(400).json({
        mensaje: `Rango mayor a 3 meses. Fecha máxima permitida para 'to' es ${maxTo}`,
      });
    }

    const sucursalIds = parseSucursalIds(
      req.query.sucursal_ids ?? req.query.sucursal_id
    );

    const topResult = await obtenerTopDescuadresService(
      from,
      to,
      restaurante,
      sucursalIds,
      limit
    );

    const faltantes: any[] = Array.isArray(topResult?.faltantes)
      ? topResult.faltantes
      : [];
    const sobrantes: any[] = Array.isArray(topResult?.sobrantes)
      ? topResult.sobrantes
      : [];

    const cedulasSet = new Set<string>();
    for (const f of faltantes) {
      if (f && f.cajero_cedula) cedulasSet.add(String(f.cajero_cedula));
    }
    for (const s of sobrantes) {
      if (s && s.cajero_cedula) cedulasSet.add(String(s.cajero_cedula));
    }
    const cedulas = Array.from(cedulasSet);

    const registrosMapRaw = await obtenerRegistrosParaCajeros(
      cedulas,
      from,
      to,
      restaurante,
      sucursalIds
    );
    const registrosMap: Record<string, any[]> = registrosMapRaw ?? {};

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Subvalle - Control Caja";
    workbook.created = new Date();

    const summarySheet = workbook.addWorksheet("Top Descuadres");
    summarySheet.columns = [
      { header: "Tipo", key: "tipo", width: 12 },
      { header: "Cédula", key: "cedula", width: 18 },
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "Cant. Reg.", key: "count", width: 12 },
      { header: "Cant. Falt.", key: "faltantes_count", width: 12 },
      { header: "Total Falt.", key: "faltantes_total", width: 16 },
      { header: "Cant. Sobr.", key: "sobrantes_count", width: 12 },
      { header: "Total Sobr.", key: "sobrantes_total", width: 16 },
      { header: "Neto", key: "neto", width: 14 },
    ];

    const pushSummaryRow = (tipo: "FALTANTE" | "SOBRANTE", item: any) => {
      summarySheet.addRow({
        tipo,
        cedula: item?.cajero_cedula ?? "",
        nombre: item?.cajero_nombre ?? "",
        count: item?.total_registros ?? 0,
        faltantes_count: item?.faltantes_count ?? 0,
        faltantes_total: item?.faltantes_total ?? 0,
        sobrantes_count: item?.sobrantes_count ?? 0,
        sobrantes_total: item?.sobrantes_total ?? 0,
        neto: item?.neto ?? 0,
      });
    };

    for (const f of faltantes) pushSummaryRow("FALTANTE", f);
    for (const s of sobrantes) pushSummaryRow("SOBRANTE", s);

    // formato numérico sin decimales (pesos)
    summarySheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          if (colNumber >= 6 && colNumber <= 9) cell.numFmt = "#,##0";
        });
      }
    });

    for (const ced of cedulas) {
      const rows = registrosMap[ced] ?? [];

      // ---------- arreglar safeName sin operadores ?? con "" que confunden a TS ----------
      let safeName: string = ced;

      if (
        rows.length > 0 &&
        typeof rows[0]?.cajero_nombre === "string" &&
        String(rows[0].cajero_nombre).trim() !== ""
      ) {
        safeName = String(rows[0].cajero_nombre).trim();
      } else {
        // buscar en faltantes
        const foundF = faltantes.find(
          (f) => String(f?.cajero_cedula) === ced && f?.cajero_nombre
        );
        if (foundF && foundF.cajero_nombre) {
          safeName = String(foundF.cajero_nombre);
        } else {
          // buscar en sobrantes
          const foundS = sobrantes.find(
            (s) => String(s?.cajero_cedula) === ced && s?.cajero_nombre
          );
          if (foundS && foundS.cajero_nombre) {
            safeName = String(foundS.cajero_nombre);
          }
        }
      }

      // fallback por si queda vacío
      if (!safeName || safeName.trim() === "") safeName = ced;

      const sheetName =
        safeName.length > 25
          ? safeName.slice(0, 22) + "..."
          : `Reg ${safeName}`;
      const sheet = workbook.addWorksheet(sheetName);

      sheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Fecha", key: "fecha_registro", width: 20 },
        { header: "Turno", key: "turno", width: 8 },
        { header: "Venta Total", key: "venta_total", width: 14 },
        { header: "Efectivo", key: "efectivo", width: 14 },
        { header: "Tarjetas", key: "tarjetas", width: 12 },
        { header: "Cant. Tarj.", key: "tarjetas_cantidad", width: 12 },
        { header: "Convenios", key: "convenios", width: 12 },
        { header: "Cant. Conv.", key: "convenios_cantidad", width: 12 },
        { header: "Bonos", key: "bonos", width: 12 },
        { header: "Cant. Bonos", key: "bonos_cantidad", width: 12 },
        { header: "Pagos Int.", key: "pagos_internos", width: 12 },
        { header: "Cant. Pagos", key: "pagos_internos_cantidad", width: 12 },
        { header: "Dinero Reg.", key: "dinero_registrado", width: 14 },
        { header: "Valor Consign.", key: "valor_consignar", width: 14 },
        { header: "Diferencia", key: "diferencia", width: 14 },
        { header: "Estado", key: "estado", width: 12 },
      ];

      for (const r of rows) {
        sheet.addRow({
          id: r.id,
          fecha_registro:
            r.fecha_registro instanceof Date
              ? r.fecha_registro.toISOString()
              : String(r.fecha_registro ?? ""),
          turno: r.turno,
          venta_total: Number(r.venta_total_registrada ?? 0),
          efectivo: Number(r.efectivo_en_caja ?? 0),
          tarjetas: Number(r.tarjetas ?? 0),
          tarjetas_cantidad: Number(r.tarjetas_cantidad ?? 0),
          convenios: Number(r.convenios ?? 0),
          convenios_cantidad: Number(r.convenios_cantidad ?? 0),
          bonos: Number(r.bonos_sodexo ?? 0),
          bonos_cantidad: Number(r.bonos_sodexo_cantidad ?? 0),
          pagos_internos: Number(r.pagos_internos ?? 0),
          pagos_internos_cantidad: Number(r.pagos_internos_cantidad ?? 0),
          dinero_registrado: Number(r.dinero_registrado ?? 0),
          valor_consignar: Number(r.valor_consignar ?? 0),
          diferencia: Number(r.diferencia ?? 0),
          estado: r.estado ?? "",
        } as Record<string, unknown>);
      }

      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.eachCell((cell, colNumber) => {
            if (colNumber >= 4 && colNumber <= 16) cell.numFmt = "#,##0";
          });
        }
      });
    }

    const filename =
      from === to
        ? `descuadres-${from}.xlsx`
        : `descuadres-${from}-to-${to}.xlsx`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Error exportando top descuadres:", error);
    return res.status(500).json({
      mensaje: "Error interno exportando reporte de descuadres",
      detalle: error?.message ?? String(error),
    });
  }
};
