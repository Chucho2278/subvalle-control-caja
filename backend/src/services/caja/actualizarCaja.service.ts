//src/services/caja/actualizarCaja.service.ts
import { Response } from "express";
import { AuthRequest } from "../../types/auth.types";

import {
  obtenerRegistroPorId,
  actualizarRegistroCajaTransaccional,
} from "../../models/caja.model";

import { calcularCaja, DatosCaja } from "../../utils/calcularCaja";
import { addAudit } from "../../utils/auditorias";

/*
  PATCH /api/caja/:id
  ✅ Se audita actualización
*/
export const actualizarCajaParcialService = async (
  req: AuthRequest,
  res: Response
) => {
  const id = Number(req.params.id);

  if (!id || Number.isNaN(id)) {
    return res.status(400).json({ mensaje: "Id inválido" });
  }

  const cambios = (req.body ?? {}) as Record<string, unknown>;

  // justo después de const cambios = (req.body ?? {}) as Record<string, unknown>;
  console.log(">>> PATCH /api/caja/:id - req.user:", req.user);
  console.log(
    ">>> PATCH /api/caja/:id - req.body (raw):",
    JSON.stringify(req.body)
  );

  try {
    const original = await obtenerRegistroPorId(id);

    if (!original) {
      return res.status(404).json({ mensaje: "Registro no encontrado" });
    }
    // temporal: colocar al inicio de actualizarCajaParcialService
    console.log(">>> PATCH /api/caja/:id - req.user:", req.user);
    console.log(
      ">>> PATCH /api/caja/:id - req.body (raw):",
      JSON.stringify(req.body)
    );
    /* =========================
       MERGE DE DATOS
    ========================= */
    const merged = {
      restaurante:
        (cambios.restaurante as string) ?? (original.restaurante as string),

      turno: (cambios.turno as string) ?? (original.turno as string),

      ventaTotalRegistrada: Number(
        cambios.ventaTotalRegistrada ??
          cambios.venta_total_registrada ??
          original.venta_total_registrada ??
          0
      ),

      efectivoEnCaja: Number(
        cambios.efectivoEnCaja ??
          cambios.efectivo_en_caja ??
          original.efectivo_en_caja ??
          0
      ),

      tarjetas: Number(cambios.tarjetas ?? original.tarjetas ?? 0),

      tarjetas_cantidad: Number(
        cambios.tarjetas_cantidad ??
          cambios.tarjetasCantidad ??
          original.tarjetas_cantidad ??
          0
      ),

      convenios: Number(cambios.convenios ?? original.convenios ?? 0),

      convenios_cantidad: Number(
        cambios.convenios_cantidad ??
          cambios.conveniosCantidad ??
          original.convenios_cantidad ??
          0
      ),

      bonosSodexo: Number(
        cambios.bonosSodexo ??
          cambios.bonos_sodexo ??
          original.bonos_sodexo ??
          0
      ),

      bonosSodexo_cantidad: Number(
        cambios.bonosSodexo_cantidad ??
          cambios.bonos_sodexo_cantidad ??
          original.bonos_sodexo_cantidad ??
          0
      ),

      pagosInternos: Number(
        cambios.pagosInternos ??
          cambios.pagos_internos ??
          original.pagos_internos ??
          0
      ),

      pagosInternos_cantidad: Number(
        cambios.pagosInternos_cantidad ??
          cambios.pagos_internos_cantidad ??
          original.pagos_internos_cantidad ??
          0
      ),

      observacion: cambios.observacion ?? original.observacion ?? null,

      cajero_nombre:
        cambios.cajero_nombre ??
        cambios.cajeroNombre ??
        (original as Record<string, unknown>).cajero_nombre ??
        null,

      cajero_cedula:
        cambios.cajero_cedula ??
        cambios.cajeroCedula ??
        (original as Record<string, unknown>).cajero_cedula ??
        null,

      sucursal_id:
        typeof cambios.sucursal_id === "number"
          ? Number(cambios.sucursal_id)
          : typeof cambios.sucursalId === "number"
          ? Number(cambios.sucursalId)
          : original.sucursal_id ?? null,
    } as const;

    /* =========================
       FECHA / HORA
    ========================= */
    const parseFechaHora = (fRaw: unknown, hRaw: unknown): Date | null => {
      const f = fRaw ? String(fRaw) : "";
      const h = hRaw ? String(hRaw) : "";

      if (f && h) {
        const secs = h.length === 5 ? `${h}:00` : h;
        const iso = `${f}T${secs}`;
        const d = new Date(iso);
        if (!isNaN(d.getTime())) return d;

        const d2 = new Date(`${f} ${secs}`);
        if (!isNaN(d2.getTime())) return d2;
        return null;
      }

      if (f) {
        const d = new Date(`${f}T00:00:00`);
        if (!isNaN(d.getTime())) return d;
      }

      return null;
    };

    const nuevaFechaRegistro =
      parseFechaHora(
        cambios.fecha_registro ?? cambios.fechaRegistro ?? null,
        cambios.hora_registro ?? cambios.horaRegistro ?? null
      ) ?? null;

    // ... después de construir `merged` y antes del recálculo:
    console.log(">>> PATCH /api/caja/:id - merged (valores usados):", {
      ventaTotalRegistrada: merged.ventaTotalRegistrada,
      efectivoEnCaja: merged.efectivoEnCaja,
      // añade lo que quieras inspeccionar
    });
    /* =========================
       RECÁLCULO
    ========================= */
    const datosParaCalculo = {
      ventaTotalRegistrada: merged.ventaTotalRegistrada,
      efectivoEnCaja: merged.efectivoEnCaja,
      tarjetas: merged.tarjetas,
      tarjetasCantidad: merged.tarjetas_cantidad,
      convenios: merged.convenios,
      conveniosCantidad: merged.convenios_cantidad,
      bonosSodexo: merged.bonosSodexo,
      bonosSodexoCantidad: merged.bonosSodexo_cantidad,
      pagosInternos: merged.pagosInternos,
      pagosInternosCantidad: merged.pagosInternos_cantidad,
    } as DatosCaja;

    const resultado = calcularCaja(datosParaCalculo);

    /* =========================
       MAPEO A SNAKE_CASE
    ========================= */
    const cambiosSnake: Partial<Record<string, unknown>> = {
      restaurante: merged.restaurante,
      turno: merged.turno,
      fecha_registro: nuevaFechaRegistro ?? original.fecha_registro ?? null,
      venta_total_registrada: merged.ventaTotalRegistrada,
      efectivo_en_caja: merged.efectivoEnCaja,
      tarjetas: merged.tarjetas,
      tarjetas_cantidad: merged.tarjetas_cantidad,
      convenios: merged.convenios,
      convenios_cantidad: merged.convenios_cantidad,
      bonos_sodexo: merged.bonosSodexo,
      bonos_sodexo_cantidad: merged.bonosSodexo_cantidad,
      pagos_internos: merged.pagosInternos,
      pagos_internos_cantidad: merged.pagosInternos_cantidad,
      valor_consignar: resultado.valorAConsignar,
      dinero_registrado: resultado.dineroRegistrado,
      diferencia: resultado.diferencia,
      estado: resultado.estado,
      observacion: merged.observacion ?? null,
      cajero_nombre: merged.cajero_nombre ?? null,
      cajero_cedula: merged.cajero_cedula ?? null,
      sucursal_id: merged.sucursal_id ?? null,
    };

    /* =========================
       CONVENIOS ITEMS
    ========================= */
    let convenios_items_parsed:
      | Array<{
          convenio_id?: number | null;
          nombre_convenio?: string | null;
          cantidad: number;
          valor: number;
        }>
      | undefined;

    if (Array.isArray(cambios.convenios_items)) {
      convenios_items_parsed = [];

      for (const it of cambios.convenios_items as Array<
        Record<string, unknown>
      >) {
        const cantidad =
          Number(String(it.cantidad ?? "0").replace(",", ".")) || 0;
        const valor = Number(String(it.valor ?? "0").replace(",", ".")) || 0;

        const convenio_id =
          typeof it.convenio_id === "number" ? it.convenio_id : null;

        const nombre_convenio =
          typeof it.nombre_convenio === "string"
            ? it.nombre_convenio
            : typeof it.nombre === "string"
            ? it.nombre
            : null;

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

    // ... después de `cambiosSnake`:
    console.log(
      ">>> PATCH /api/caja/:id - cambiosSnake (a aplicar):",
      cambiosSnake
    );
    if (convenios_items_parsed)
      console.log(
        ">>> PATCH /api/caja/:id - convenios_items_parsed:",
        convenios_items_parsed
      );
    /* =========================
       ACTUALIZAR EN DB
    ========================= */
    const ok = await actualizarRegistroCajaTransaccional(
      id,
      cambiosSnake,
      convenios_items_parsed
    );

    if (!ok) {
      return res.status(404).json({
        mensaje: "Registro no encontrado o no actualizado",
      });
    }

    const actualizado = await obtenerRegistroPorId(id);

    /* =========================
       AUDITORÍA
    ========================= */
    void addAudit(req, {
      accion: "actualizar_registro",
      recurso: "registro_caja",
      recurso_id: id,
      detalle: JSON.stringify({ cambios: cambiosSnake }),
    }).catch(() => {});

    return res.json({
      mensaje: "Registro actualizado y recalculado",
      resultado,
      registro: actualizado ?? null,
    });
  } catch (error: unknown) {
    console.error("Error actualizando caja:", error);
    return res.status(500).json({
      mensaje: "Error interno al actualizar registro",
      detalle:
        error && typeof error === "object" && "message" in error
          ? (error as { message?: string }).message
          : String(error),
    });
  }
};
