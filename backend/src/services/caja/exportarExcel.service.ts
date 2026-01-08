// backend/src/services/caja/exportarExcel.service.ts
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
  const INT_FORMAT = "#,##0";

  try {
    /* ============================================================
       RESUMEN POR TURNOS (sin cambios)
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
        { header: "Cant. Pagos Int.", key: "pagosInternosQuantity", width: 20 },
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
        if (sheet.getColumn(key)) sheet.getColumn(key).numFmt = MONEY_FORMAT;
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
       DETALLE DE REGISTROS + DESGLOSE DINÁMICO DE CONVENIOS
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

    // 1) obtener lista de convenios usados en el rango/filtrado (id + nombre)
    const condicionesConvenios = [...condiciones];
    const paramsConvenios = [...params];

    // necesitamos unir con registro_convenios y agrupar por convenio para obtener nombres únicos
    const sqlConvenios = `
      SELECT DISTINCT rc.convenio_id AS convenio_id, rc.nombre_convenio AS nombre_convenio
      FROM registro_convenios rc
      JOIN registro_caja r ON rc.registro_caja_id = r.id
      WHERE ${condicionesConvenios.join(" AND ")}
      ORDER BY rc.nombre_convenio ASC
    `;

    const [conveniosListRaw] = (await pool.query(
      sqlConvenios,
      paramsConvenios
    )) as [
      Array<{ convenio_id?: number | null; nombre_convenio?: string | null }>,
      unknown
    ];

    const conveniosList = Array.isArray(conveniosListRaw)
      ? conveniosListRaw
          .filter((c) => c.convenio_id != null)
          .map((c) => ({
            id: Number(c.convenio_id),
            nombre: String(c.nombre_convenio ?? `conv_${c.convenio_id}`),
          }))
      : [];

    // 2) obtener desglose por registro y convenio (sumas)
    let conveniosPorRegistroMap: Record<
      string,
      Record<number, { cantidad: number; valor: number }>
    > = {};

    if (conveniosList.length > 0) {
      const sqlConveniosPorRegistro = `
        SELECT rc.registro_caja_id AS registro_id,
               rc.convenio_id AS convenio_id,
               rc.nombre_convenio AS nombre_convenio,
               SUM(rc.cantidad) AS cantidad,
               SUM(rc.valor) AS valor
        FROM registro_convenios rc
        JOIN registro_caja r ON rc.registro_caja_id = r.id
        WHERE ${condicionesConvenios.join(" AND ")}
        GROUP BY rc.registro_caja_id, rc.convenio_id, rc.nombre_convenio
      `;

      const [convRows] = (await pool.query(
        sqlConveniosPorRegistro,
        paramsConvenios
      )) as [
        Array<{
          registro_id?: number;
          convenio_id?: number;
          nombre_convenio?: string;
          cantidad?: number;
          valor?: number;
        }>,
        unknown
      ];

      if (Array.isArray(convRows)) {
        for (const cr of convRows) {
          const regId = String(cr.registro_id ?? "");
          if (!conveniosPorRegistroMap[regId])
            conveniosPorRegistroMap[regId] = {};
          conveniosPorRegistroMap[regId][Number(cr.convenio_id ?? 0)] = {
            cantidad: Number(cr.cantidad ?? 0),
            valor: Number(cr.valor ?? 0),
          };
        }
      }
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Registros Caja");

    /* =========================
       Construir columnas: columnas base + columnas dinámicas por convenio
    ========================= */
    const baseKeys =
      rows.length > 0
        ? Object.keys(rows[0])
        : [
            "id",
            "restaurante",
            "sucursal_id",
            "turno",
            "fecha_registro",
            "venta_total_registrada",
            "efectivo_en_caja",
            "tarjetas",
            "tarjetas_cantidad",
            "convenios",
            "convenios_cantidad",
            "bonos_sodexo",
            "bonos_sodexo_cantidad",
            "pagos_internos",
            "pagos_internos_cantidad",
            "valor_consignar",
            "dinero_registrado",
            "diferencia",
            "estado",
            "observacion",
            "cajero_nombre",
            "cajero_cedula",
            "creado_en",
          ];

    const columns: Array<{ header: string; key: string; width?: number }> =
      baseKeys.map((k) => ({
        header: k.toUpperCase(),
        key: k,
        width: 18,
      }));

    // Añadir columnas por cada convenio: cantidad y valor
    for (const conv of conveniosList) {
      const safeName = String(conv.nombre ?? `Conv ${conv.id}`).trim();
      // generar keys únicos y legibles
      const cantKey = `convenio_${conv.id}_cantidad`;
      const valKey = `convenio_${conv.id}_valor`;

      columns.push({
        header: `${safeName} (Cant.)`,
        key: cantKey,
        width: 12,
      });
      columns.push({
        header: `${safeName} (Valor)`,
        key: valKey,
        width: 14,
      });
    }

    sheet.columns = columns;

    /* =========================
       Rellenar filas con valores incluidos los convenios
    ========================= */
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

    for (const r of rows) {
      const rowObj: Record<string, unknown> = { ...r };

      // convertir keys monetarios a number
      MONEY_KEYS.forEach((k) => {
        if (k in rowObj) rowObj[k] = Number(rowObj[k]) || 0;
      });

      // rellenar convenios dinámicos para este registro
      const regId = String(r.id ?? "");
      const convForReg = conveniosPorRegistroMap[regId] ?? {};

      for (const conv of conveniosList) {
        const cantKey = `convenio_${conv.id}_cantidad`;
        const valKey = `convenio_${conv.id}_valor`;

        const entry = convForReg[conv.id];
        rowObj[cantKey] = entry ? Number(entry.cantidad) || 0 : 0;
        rowObj[valKey] = entry ? Number(entry.valor) || 0 : 0;
      }

      sheet.addRow(rowObj);
    }

    // aplicar formatos
    // formato moneda para todas las columnas que terminan en '_valor' y para MONEY_KEYS
    sheet.columns.forEach((col) => {
      if (!col || typeof col.key !== "string") return;
      const key = col.key as string;
      if (MONEY_KEYS.includes(key)) {
        col.numFmt = MONEY_FORMAT;
      } else if (key.endsWith("_valor")) {
        col.numFmt = MONEY_FORMAT;
      } else if (
        key.endsWith("_cantidad") ||
        key.endsWith("_cant") ||
        key === "tarjetas_cantidad" ||
        key === "convenios_cantidad"
      ) {
        col.numFmt = INT_FORMAT;
      }
    });

    await addAudit(req, {
      accion: "exportar_excel_detalle",
      recurso: "registro_caja",
      recurso_id: null,
      detalle: JSON.stringify({
        from: fechaFrom,
        to: fechaTo,
        conveniosCount: conveniosList.length,
      }),
    }).catch(() => {});

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="registros-${fechaFrom}-a-${fechaTo}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exportando Excel:", error);
    return res.status(500).json({
      mensaje: "Error interno al exportar Excel",
    });
  }
};
