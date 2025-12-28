// src/services/caja/registrarCaja.service.ts
import { Response } from "express";
import { pool } from "../../utils/db";
import { calcularCaja, DatosCaja } from "../../utils/calcularCaja";
import { readNumber, readString } from "../../utils/caja/bodyReaders";
import { guardarRegistro } from "../../models/caja.model";
import { addAudit } from "../../utils/auditorias";
import { AuthRequest } from "../../types/auth.types";

/* -------------------- POST /api/caja/registrar -------------------- */
export const registrarCajaService = async (req: AuthRequest, res: Response) => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  /* ========= LECTURA TOLERANTE ========= */
  const ventaTotalRegistrada = readNumber(body, [
    "ventaTotalRegistrada",
    "venta_total_registrada",
  ]);

  const efectivoEnCaja = readNumber(body, [
    "efectivoEnCaja",
    "efectivo_en_caja",
  ]);

  const tarjetas = readNumber(body, ["tarjetas"]);

  const tarjetas_cantidad = readNumber(body, [
    "tarjetas_cantidad",
    "tarjetasCantidad",
  ]);

  const convenios = readNumber(body, ["convenios"]);

  const convenios_cantidad = readNumber(body, [
    "convenios_cantidad",
    "conveniosCantidad",
  ]);

  const bonosSodexo = readNumber(body, ["bonosSodexo", "bonos_sodexo"]);

  const bonosSodexo_cantidad = readNumber(body, [
    "bonosSodexo_cantidad",
    "bonos_sodexo_cantidad",
  ]);

  const pagosInternos = readNumber(body, ["pagosInternos", "pagos_internos"]);

  const pagosInternos_cantidad = readNumber(body, [
    "pagosInternos_cantidad",
    "pagos_internos_cantidad",
  ]);

  const turno = readString(body, ["turno"]) ?? "";
  const restaurante = readString(body, ["restaurante"]) ?? "";

  const cajero_nombre = readString(body, ["cajero_nombre", "cajeroNombre"]);
  const cajero_cedula = readString(body, ["cajero_cedula", "cajeroCedula"]);

  /* ========= VALIDACIONES ========= */
  if (!cajero_nombre || cajero_nombre.trim() === "")
    return res.status(400).json({ mensaje: "Nombre del cajero requerido" });

  if (!cajero_cedula || cajero_cedula.trim() === "")
    return res.status(400).json({ mensaje: "Cédula del cajero requerida" });

  if (!restaurante || restaurante.trim() === "")
    return res.status(400).json({ mensaje: "Restaurante requerido" });

  if (!turno) return res.status(400).json({ mensaje: "Turno requerido" });

  /* ========= CONVENIOS ITEMS ========= */
  const convenios_items_parsed: Array<{
    convenio_id?: number | null;
    nombre_convenio?: string | null;
    cantidad: number;
    valor: number;
  }> = [];

  if (Array.isArray(body.convenios_items)) {
    for (const itRaw of body.convenios_items as unknown[]) {
      const it = (itRaw ?? {}) as Record<string, unknown>;

      const cantidad =
        Number(String(it.cantidad ?? "0").replace(",", ".")) || 0;
      const valor = Number(String(it.valor ?? "0").replace(",", ".")) || 0;

      const convenio_id =
        typeof it.convenio_id === "number" ? it.convenio_id : null;
      const nombre_convenio =
        typeof it.nombre_convenio === "string" ? it.nombre_convenio : null;

      if (cantidad > 0 || valor > 0 || convenio_id || nombre_convenio) {
        convenios_items_parsed.push({
          convenio_id,
          nombre_convenio,
          cantidad,
          valor,
        });
      }
    }
  }

  /* ========= CÁLCULO ========= */
  const datosParaCalculo = {
    ventaTotalRegistrada,
    efectivoEnCaja,
    tarjetas,
    tarjetasCantidad: tarjetas_cantidad,
    convenios,
    conveniosCantidad: convenios_cantidad,
    bonosSodexo,
    bonosSodexoCantidad: bonosSodexo_cantidad,
    pagosInternos,
    pagosInternosCantidad: pagosInternos_cantidad,
  } as unknown as DatosCaja;

  const resultado = calcularCaja(datosParaCalculo);

  /* ========= FECHAS ========= */
  const fechaRegistroIso = (() => {
    const f = body.fecha_registro ? String(body.fecha_registro) : "";
    const h = body.hora_registro ? String(body.hora_registro) : "";

    if (f && h) {
      const secs = h.length === 5 ? `${h}:00` : h;
      const d = new Date(`${f}T${secs}`);
      if (!isNaN(d.getTime())) return d;
      return null;
    }

    if (f) {
      const d = new Date(f + "T00:00:00");
      if (!isNaN(d.getTime())) return d;
    }

    return null;
  })();

  const fechaParaComparar = fechaRegistroIso ?? new Date();
  const fechaYmdStr = fechaParaComparar.toISOString().slice(0, 10);

  /* ========= REGISTRO ========= */
  const registroToSave: Record<string, unknown> = {
    restaurante,
    turno: turno as "A" | "B" | "C" | "D",
    venta_total_registrada: ventaTotalRegistrada,
    efectivo_en_caja: efectivoEnCaja,
    tarjetas,
    tarjetas_cantidad,
    convenios,
    convenios_cantidad,
    bonos_sodexo: bonosSodexo,
    bonos_sodexo_cantidad: bonosSodexo_cantidad,
    pagos_internos: pagosInternos,
    pagos_internos_cantidad: pagosInternos_cantidad,
    valor_consignar: resultado.valorAConsignar,
    dinero_registrado: resultado.dineroRegistrado,
    diferencia: resultado.diferencia,
    estado: resultado.estado,
    observacion: readString(body, ["observacion"]) ?? null,
    cajero_nombre,
    cajero_cedula,
    fecha_registro: fechaRegistroIso,
    sucursal_id: typeof body.sucursal_id === "number" ? body.sucursal_id : null,
  };

  try {
    /* ========= DUPLICADOS ========= */
    const sucursalId = registroToSave.sucursal_id as number | null;

    const [rows] = (await pool.query(
      sucursalId !== null
        ? `SELECT COUNT(*) c FROM registro_caja WHERE sucursal_id = ? AND turno = ? AND DATE(fecha_registro) = ?`
        : `SELECT COUNT(*) c FROM registro_caja WHERE restaurante = ? AND turno = ? AND DATE(fecha_registro) = ?`,
      sucursalId !== null
        ? [sucursalId, registroToSave.turno, fechaYmdStr]
        : [registroToSave.restaurante, registroToSave.turno, fechaYmdStr]
    )) as any;

    if (Number(rows?.[0]?.c ?? 0) > 0) {
      return res.status(409).json({
        mensaje: "Turno ya registrado, seleccione otro turno",
      });
    }

    /* ========= GUARDAR ========= */
    const insertId = await guardarRegistro(
      registroToSave,
      convenios_items_parsed.length ? convenios_items_parsed : undefined
    );

    /* ========= AUDITORÍA ========= */
    void addAudit(req, {
      accion: "crear_registro",
      recurso: "registro_caja",
      recurso_id: insertId ?? null,
      detalle: JSON.stringify({
        restaurante,
        turno,
        cajero_nombre,
        cajero_cedula,
      }),
    }).catch(() => {});

    return res.status(201).json({
      mensaje: "Registro guardado exitosamente",
      id: insertId,
      resultado,
    });
  } catch (error: any) {
    console.error("Error guardando en BD:", error);
    return res.status(500).json({
      mensaje: "Error interno al guardar registro",
      detalle: error?.message ?? String(error),
    });
  }
};
