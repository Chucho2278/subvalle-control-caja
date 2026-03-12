import type { AxiosResponse } from "axios";
import { api } from "./index";

/* ---------- Tipos frontend (camelCase para inputs / UI) ---------- */
export interface CajaInput {
  restaurante: string;
  sucursal_id?: number | null;
  turno: "A" | "B" | "C" | "D";
  ventaTotalRegistrada: number;
  efectivoEnCaja: number;
  tarjetas: number;
  tarjetasCantidad: number;
  convenios: number;
  conveniosCantidad: number;
  bonosSodexo: number;
  bonosSodexoCantidad: number;
  pagosInternos: number;
  pagosInternosCantidad: number;
  fechaRegistro?: string;
  horaRegistro?: string;
  cajerNombre?: string;
  cajeroCedula?: string;
  observacion?: string;
  conveniosItems?: Array<{
    convenio_id?: number | null;
    nombre_convenio?: string | null;
    cantidad: number;
    valor: number;
  }>;
}

/* Tipo que usará la UI (camelCase) */
export interface RegistroCajaUI {
  id?: number;
  restaurante: string;
  turno: "A" | "B" | "C" | "D";
  ventaTotalRegistrada: number;
  efectivoEnCaja: number;
  tarjetas: number;
  tarjetasCantidad: number;
  convenios: number;
  conveniosCantidad: number;
  bonosSodexo: number;
  bonosSodexoCantidad: number;
  pagosInternos: number;
  pagosInternosCantidad: number;
  valorConsignar: number;
  dineroRegistrado: number;
  diferencia: number;
  estado: string;
  observacion?: string | null;
  fechaRegistro?: string;
}

/* ---------- Tipos que devuelve el backend (snake_case) ---------- */
export interface RegistroCaja {
  id?: number;
  restaurante: string;
  turno: "A" | "B" | "C" | "D";
  venta_total_registrada: number;
  efectivo_en_caja: number;
  tarjetas: number;
  tarjetas_cantidad: number;
  convenios: number;
  convenios_cantidad: number;
  bonos_sodexo: number;
  bonos_sodexo_cantidad: number;
  pagos_internos: number;
  pagos_internos_cantidad: number;
  valor_consignar: number;
  dinero_registrado: number;
  diferencia: number;
  estado: string;
  observacion?: string | null;
  fecha_registro?: string;
}

/* ---------- Tipos resumen ---------- */
export interface ResumenTurno {
  turno: "A" | "B" | "C" | "D" | string;
  ventaTotal: number;
  efectivo: number;
  tarjetas: number;
  tarjetasCantidad: number;
  convenios: number;
  conveniosCantidad: number;
  bonos: number;
  bonosCantidad: number;
  pagosInternos: number;
  pagosInternosCantidad: number;
  dineroRegistrado: number;
  valorConsignar: number;
  diferencia: number;
}

export type TotalDiario = Omit<ResumenTurno, "turno">;

export type ListarCajasParams = {
  fecha?: string;
  restaurante?: string;
  turno?: "A" | "B" | "C" | "D";
  page?: number;
  limit?: number;
};

/* Respuesta original del backend (snake_case) */
export type ListarCajasResponseSnake = {
  page: number;
  limit: number;
  total: number;
  registros: RegistroCaja[];
};

/* Respuesta que usaremos en la UI (registros ya en camelCase) */
export type ListarCajasResponseUI = {
  page: number;
  limit: number;
  total: number;
  registros: RegistroCajaUI[];
};

/* ---------- Payload types (snake_case) para enviar al backend ---------- */
type CajaPayload = {
  restaurante: string;
  sucursal_id?: number | null;
  turno: RegistroCaja["turno"];
  venta_total_registrada: number;
  efectivo_en_caja: number;
  tarjetas: number;
  tarjetas_cantidad: number;
  convenios: number;
  convenios_cantidad: number;
  bonos_sodexo: number;
  bonos_sodexo_cantidad: number;
  pagos_internos: number;
  pagos_internos_cantidad: number;
  fecha_registro?: string;
  hora_registro?: string;
  cajero_nombre?: string;
  cajero_cedula?: string;
  observacion?: string | null;
  convenios_items?: Array<{
    convenio_id?: number | null;
    nombre_convenio?: string | null;
    cantidad: number;
    valor: number;
  }>;
};

type PartialCajaPayload = Partial<CajaPayload>;

/* ------------------ Mappers (camelCase <-> snake_case) ------------------ */

/** Mapea lo que envía la UI (CajaInput) a lo que espera el backend (CajaPayload) */
function mapCajaInputToSnake(data: CajaInput): CajaPayload {
  return {
    restaurante: data.restaurante,
    sucursal_id: data.sucursal_id ?? null,
    turno: data.turno,
    venta_total_registrada: data.ventaTotalRegistrada,
    efectivo_en_caja: data.efectivoEnCaja,
    tarjetas: data.tarjetas,
    tarjetas_cantidad: data.tarjetasCantidad,
    convenios: data.convenios,
    convenios_cantidad: data.conveniosCantidad,
    bonos_sodexo: data.bonosSodexo,
    bonos_sodexo_cantidad: data.bonosSodexoCantidad,
    pagos_internos: data.pagosInternos,
    pagos_internos_cantidad: data.pagosInternosCantidad,
    fecha_registro: data.fechaRegistro,
    hora_registro: data.horaRegistro,
    cajero_nombre: data.cajerNombre,
    cajero_cedula: data.cajeroCedula,
    observacion: data.observacion ?? null,
    ...(data.conveniosItems !== undefined && {
      convenios_items: data.conveniosItems.map((it) => ({
        convenio_id: it.convenio_id ?? null,
        nombre_convenio: it.nombre_convenio ?? null,
        cantidad: it.cantidad,
        valor: it.valor,
      })),
    }),
  };
}

/** Mapea campos parciales (patch) */
function mapPartialCajaToSnake(
  partial: Partial<CajaInput>,
): PartialCajaPayload {
  const out: PartialCajaPayload = {};
  if (partial.restaurante !== undefined) out.restaurante = partial.restaurante;
  if (partial.sucursal_id !== undefined)
    out.sucursal_id = partial.sucursal_id ?? null;
  if (partial.turno !== undefined) out.turno = partial.turno;
  if (partial.ventaTotalRegistrada !== undefined)
    out.venta_total_registrada = partial.ventaTotalRegistrada;
  if (partial.efectivoEnCaja !== undefined)
    out.efectivo_en_caja = partial.efectivoEnCaja;
  if (partial.tarjetas !== undefined) out.tarjetas = partial.tarjetas;
  if (partial.tarjetasCantidad !== undefined)
    out.tarjetas_cantidad = partial.tarjetasCantidad;
  if (partial.convenios !== undefined) out.convenios = partial.convenios;
  if (partial.conveniosCantidad !== undefined)
    out.convenios_cantidad = partial.conveniosCantidad;
  if (partial.bonosSodexo !== undefined) out.bonos_sodexo = partial.bonosSodexo;
  if (partial.bonosSodexoCantidad !== undefined)
    out.bonos_sodexo_cantidad = partial.bonosSodexoCantidad;
  if (partial.pagosInternos !== undefined)
    out.pagos_internos = partial.pagosInternos;
  if (partial.pagosInternosCantidad !== undefined)
    out.pagos_internos_cantidad = partial.pagosInternosCantidad;
  if (partial.fechaRegistro !== undefined)
    out.fecha_registro = partial.fechaRegistro;
  if (partial.horaRegistro !== undefined)
    out.hora_registro = partial.horaRegistro;
  if (partial.cajerNombre !== undefined)
    out.cajero_nombre = partial.cajerNombre;
  if (partial.cajeroCedula !== undefined)
    out.cajero_cedula = partial.cajeroCedula;
  if (partial.observacion !== undefined)
    out.observacion = partial.observacion ?? null;
  if (partial.conveniosItems !== undefined) {
    out.convenios_items = partial.conveniosItems.map((it) => ({
      convenio_id: it.convenio_id ?? null,
      nombre_convenio: it.nombre_convenio ?? null,
      cantidad: it.cantidad,
      valor: it.valor,
    }));
  }
  return out;
}

/** Mapea un registro snake_case → RegistroCajaUI (camelCase) */
function mapRegistroToUI(r: RegistroCaja): RegistroCajaUI {
  return {
    id: r.id,
    restaurante: r.restaurante,
    turno: r.turno,
    ventaTotalRegistrada: r.venta_total_registrada,
    efectivoEnCaja: r.efectivo_en_caja,
    tarjetas: r.tarjetas,
    tarjetasCantidad: r.tarjetas_cantidad,
    convenios: r.convenios,
    conveniosCantidad: r.convenios_cantidad,
    bonosSodexo: r.bonos_sodexo,
    bonosSodexoCantidad: r.bonos_sodexo_cantidad,
    pagosInternos: r.pagos_internos,
    pagosInternosCantidad: r.pagos_internos_cantidad,
    valorConsignar: r.valor_consignar,
    dineroRegistrado: r.dinero_registrado,
    diferencia: r.diferencia,
    estado: r.estado,
    observacion: r.observacion ?? null,
    fechaRegistro: r.fecha_registro ? String(r.fecha_registro) : undefined,
  };
}

/* ------------------ Funciones API (tipadas) ------------------ */

export function postCaja(data: CajaInput) {
  const payload = mapCajaInputToSnake(data);
  return api.post("/caja/registrar", payload);
}

export async function listarCajas(
  params?: ListarCajasParams,
): Promise<ListarCajasResponseUI> {
  const res: AxiosResponse<ListarCajasResponseSnake> = await api.get("/caja", {
    params,
  });
  const snake = res.data;
  const registrosUI = (snake.registros ?? []).map(mapRegistroToUI);
  return {
    page: snake.page,
    limit: snake.limit,
    total: snake.total,
    registros: registrosUI,
  };
}

export async function getCaja(
  id: number,
): Promise<{ registro: RegistroCajaUI }> {
  const res = await api.get<{ registro: RegistroCaja }>(`/caja/${id}`);
  return { registro: mapRegistroToUI(res.data.registro) };
}

export function patchCaja(id: number, data: Partial<CajaInput>) {
  const payload = mapPartialCajaToSnake(data);
  return api.patch(`/caja/${id}`, payload);
}

export function deleteCaja(id: number) {
  return api.delete(`/caja/${id}`);
}

export function getResumen(fecha: string) {
  return api.get<{ resumen: ResumenTurno[]; total: TotalDiario }>(
    "/caja/resumen",
    { params: { fecha } },
  );
}

export async function descargarExcelResumen(fecha: string) {
  const res = await api.get<Blob>("/caja/resumen/excel", {
    params: { fecha },
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `resumen-${fecha}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
