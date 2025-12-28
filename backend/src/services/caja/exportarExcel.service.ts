import { Response } from "express";
import ExcelJS from "exceljs";

import { AuthRequest } from "../../types/auth.types";
import { pool } from "../../utils/db";
import { addAudit } from "../../utils/auditorias";
import { maxToDateForFrom } from "../../utils/caja/fechas";
import { obtenerResumenTurnosService } from "./resumenTurnos.service";

/* =========================
   SERVICE PRINCIPAL
========================= */
export const exportarExcelService = async (req: AuthRequest, res: Response) => {
  const fecha = String(req.query.fecha ?? "").trim();
  const from = String(req.query.from ?? "").trim();
  const to = String(req.query.to ?? "").trim();
  const restaurante = req.query.restaurante
    ? String(req.query.restaurante)
    : null;

  /* =========================
     SUCURSALES
  ========================= */
  const rawSuc = req.query.sucursal_ids ?? req.query.sucursal_id;
  let sucursalIds: number[] = [];

  if (Array.isArray(rawSuc)) {
    sucursalIds = rawSuc
      .flatMap((x) => String(x).split(","))
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  } else if (typeof rawSuc === "string" && rawSuc.trim()) {
    sucursalIds = rawSuc
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n));
  }

  /* =========================
     FECHAS
  ========================= */
  let fechaFrom = "";
  let fechaTo = "";

  if (from && to) {
    fechaFrom = from;
    fechaTo = to;
  } else if (fecha) {
    fechaFrom = fecha;
    fechaTo = fecha;
  } else {
    return res.status(400).json({
      mensaje: "Debe proporcionar 'from' y 'to' o 'fecha'",
    });
  }

  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(fechaFrom) || !isoRegex.test(fechaTo)) {
    return res.status(400).json({
      mensaje: "Formato de fecha inválido (YYYY-MM-DD)",
    });
  }

  if (from && to) {
    const maxTo = maxToDateForFrom(fechaFrom);
    if (fechaTo > maxTo) {
      return res.status(400).json({
        mensaje: `Rango mayor a 3 meses. Máximo permitido: ${maxTo}`,
      });
    }
  }

  const format = String(req.query.format ?? "").toLowerCase();

  /** ========================
   * FORMATO MONEDA
   ========================= */
  const MONEY_FORMAT = '"$"#,##0;[Red]-"$"#,##0';

  try {
    /* ============================================================
       RESUMEN POR TURNOS
    ============================================================ */
    if (format === "resumen") {
      const sucursalId = sucursalIds.length === 1 ? sucursalIds[0] : null;

      const { resumen, total } = await obtenerResumenTurnosService(
        fechaFrom,
        fechaTo,
        restaurante,
        sucursalId
      );

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Resumen por Turno");

      sheet.columns = [
        { header: "Turno", key: "turno", width: 12 },
        { header: "Venta Total", key: "ventaTotal", width: 16 },
        { header: "Efectivo", key: "efectivo", width: 16 },
        { header: "Tarjetas", key: "tarjetas", width: 16 },
        { header: "Cant. Tarjetas", key: "tarjetasCantidad", width: 18 },
        { header: "Convenios", key: "convenios", width: 16 },
        { header: "Cant. Convenios", key: "conveniosCantidad", width: 18 },
        { header: "Bonos", key: "bonos", width: 16 },
        { header: "Cant. Bonos", key: "bonosCantidad", width: 18 },
        { header: "Pagos Internos", key: "pagosInternos", width: 18 },
        { header: "Cant. Pagos Int.", key: "pagosInternosCantidad", width: 20 },
        { header: "Dinero Registrado", key: "dineroRegistrado", width: 18 },
        { header: "Valor a Consignar", key: "valorConsignar", width: 18 },
        { header: "Diferencia", key: "diferencia", width: 16 },
      ];

      resumen.forEach((r) => {
        sheet.addRow({
          ...r,
          ventaTotal: Number(r.ventaTotal) || 0,
          efectivo: Number(r.efectivo) || 0,
          tarjetas: Number(r.tarjetas) || 0,
          convenios: Number(r.convenios) || 0,
          bonos: Number(r.bonos) || 0,
          pagosInternos: Number(r.pagosInternos) || 0,
          dineroRegistrado: Number(r.dineroRegistrado) || 0,
          valorConsignar: Number(r.valorConsignar) || 0,
          diferencia: Number(r.diferencia) || 0,
        });
      });

      sheet.addRow({});
      sheet.addRow({
        turno: "TOTAL",
        ...Object.fromEntries(
          Object.entries(total).map(([k, v]) => [k, Number(v) || 0])
        ),
      });

      [
        "ventaTotal",
        "efectivo",
        "tarjetas",
        "convenios",
        "bonos",
        "pagosInternos",
        "dineroRegistrado",
        "valorConsignar",
        "diferencia",
      ].forEach((key) => {
        sheet.getColumn(key).numFmt = MONEY_FORMAT;
      });

      await addAudit(req, {
        accion: "exportar_excel_resumen",
        recurso: "registro_caja",
        recurso_id: null,
        detalle: JSON.stringify({ from: fechaFrom, to: fechaTo }),
      }).catch(() => {});

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="resumen-${fechaFrom}-a-${fechaTo}.xlsx"`
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    /* ============================================================
       DETALLE DE REGISTROS
    ============================================================ */
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (restaurante) {
      condiciones.push("restaurante = ?");
      params.push(restaurante);
    }

    if (sucursalIds.length === 1) {
      condiciones.push("sucursal_id = ?");
      params.push(sucursalIds[0]);
    } else if (sucursalIds.length > 1) {
      condiciones.push(
        `sucursal_id IN (${sucursalIds.map(() => "?").join(",")})`
      );
      params.push(...sucursalIds);
    }

    condiciones.push("DATE(fecha_registro) BETWEEN ? AND ?");
    params.push(fechaFrom, fechaTo);

    const sql = `
      SELECT *
      FROM registro_caja
      WHERE ${condiciones.join(" AND ")}
      ORDER BY fecha_registro DESC
    `;

    const [rows] = (await pool.query(sql, params)) as [
      Array<Record<string, unknown>>,
      unknown
    ];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Registros Caja");

    if (rows.length > 0) {
      sheet.columns = Object.keys(rows[0]).map((key) => ({
        header: key.toUpperCase(),
        key,
        width: 18,
      }));

      const MONEY_KEYS = [
        "venta_total_registrada",
        "efectivo_en_caja",
        "tarjetas",
        "convenios",
        "bonos_sodexo",
        "pagos_internos",
        "dinero_registrado",
        "valor_consignar",
        "diferencia",
      ];

      rows.forEach((r) => {
        const row: Record<string, unknown> = { ...r };

        MONEY_KEYS.forEach((k) => {
          if (k in row) row[k] = Number(row[k]) || 0;
        });

        sheet.addRow(row);
      });

      MONEY_KEYS.forEach((k) => {
        if (sheet.getColumn(k)) {
          sheet.getColumn(k).numFmt = MONEY_FORMAT;
        }
      });
    }

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportando Excel:", error);
    return res.status(500).json({
      mensaje: "Error interno al exportar Excel",
    });
  }
};
