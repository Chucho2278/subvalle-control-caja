// frontend/src/pages/ViewCajaPage.tsx
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../utils/authService";
import "./ViewCajaPage.css";

/** Tipos locales */
type ConvenioDetalle = {
  id?: number;
  registro_caja_id?: number;
  convenio_id?: number | null;
  nombre_convenio?: string | null;
  cantidad: number;
  valor: number;
  creado_en?: string | null;
};

type Registro = {
  id: number;
  restaurante: string;
  turno: "A" | "B" | "C" | "D" | "";
  cajero_nombre?: string | null;
  cajero_cedula?: string | null;
  venta_total_registrada?: number | null;
  efectivo_en_caja?: number | null;
  tarjetas?: number | null;
  tarjetas_cantidad?: number | null;
  convenios?: number | null;
  convenios_cantidad?: number | null;
  bonos_sodexo?: number | null;
  bonos_sodexo_cantidad?: number | null;
  pagos_internos?: number | null;
  pagos_internos_cantidad?: number | null;
  valor_consignar?: number | null;
  dinero_registrado?: number | null;
  diferencia?: number | null;
  estado?: string | null;
  observacion?: string | null;
  fecha_registro?: string | null;
};

type RegistroCajaResponse = {
  registro: unknown;
  convenios?: unknown;
};

/** Utiles de parseo seguro */
const toNumberOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const s = v.trim().replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toStringOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  return String(v);
};

const toIntOrNull = (v: unknown): number | null => {
  const n = toNumberOrNull(v);
  return n === null ? null : Math.round(n);
};

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

/** Normalizadores (aceptan snake_case o camelCase) */
function normalizeRegistro(raw: unknown): Registro | null {
  if (!isObject(raw)) return null;
  const get = (k1: string, k2?: string) =>
    raw[k1] ?? (k2 ? raw[k2] : undefined);

  const id = toIntOrNull(get("id", "registro_id")) ?? 0;
  const restaurante =
    toStringOrNull(get("restaurante", "sucursal_nombre")) ?? "—";
  const turno = (toStringOrNull(get("turno")) ?? "") as
    | "A"
    | "B"
    | "C"
    | "D"
    | "";

  const registro: Registro = {
    id,
    restaurante,
    turno,
    cajero_nombre: toStringOrNull(get("cajero_nombre", "cajeroNombre")),
    cajero_cedula: toStringOrNull(get("cajero_cedula", "cajeroCedula")),
    venta_total_registrada: toNumberOrNull(
      get("venta_total_registrada", "ventaTotalRegistrada")
    ),
    efectivo_en_caja: toNumberOrNull(get("efectivo_en_caja", "efectivoEnCaja")),
    tarjetas: toNumberOrNull(get("tarjetas")),
    tarjetas_cantidad: toIntOrNull(
      get("tarjetas_cantidad", "tarjetasCantidad")
    ),
    convenios: toNumberOrNull(get("convenios")),
    convenios_cantidad:
      toIntOrNull(get("convenios_cantidad", "conveniosQuantity")) ??
      toIntOrNull(get("convenios_cantidad", "conveniosCantidad")),
    bonos_sodexo: toNumberOrNull(get("bonos_sodexo", "bonosSodexo")),
    bonos_sodexo_cantidad:
      toIntOrNull(get("bonos_sodexo_cantidad", "bonosSodexoQuantity")) ??
      toIntOrNull(get("bonos_sodexo_cantidad", "bonos_sodexo_cantidad")),
    pagos_internos: toNumberOrNull(get("pagos_internos", "pagosInternos")),
    pagos_internos_cantidad:
      toIntOrNull(get("pagos_internos_cantidad", "pagosInternosQuantity")) ??
      toIntOrNull(get("pagos_internos_cantidad", "pagos_internos_cantidad")),
    valor_consignar: toNumberOrNull(get("valor_consignar", "valorConsignar")),
    dinero_registrado: toNumberOrNull(
      get("dinero_registrado", "dineroRegistrado")
    ),
    diferencia: toNumberOrNull(get("diferencia")),
    estado: toStringOrNull(get("estado")),
    observacion: toStringOrNull(get("observacion")),
    fecha_registro: toStringOrNull(get("fecha_registro", "fechaRegistro")),
  };

  return registro;
}

function normalizeConvenios(rawList: unknown): ConvenioDetalle[] {
  if (!Array.isArray(rawList)) return [];
  const out: ConvenioDetalle[] = [];
  for (const it of rawList) {
    if (!isObject(it)) continue;
    const id = toIntOrNull(it.id ?? it.registro_convenio_id) ?? undefined;
    const registro_caja_id =
      toIntOrNull(it.registro_caja_id ?? it.registroId) ?? undefined;
    const convenio_id = toIntOrNull(it.convenio_id ?? it.convenioId) ?? null;
    const nombre_convenio =
      toStringOrNull(it.nombre_convenio ?? it.nombreConvenio) ?? null;
    const cantidad = toIntOrNull(it.cantidad) ?? 0;
    const valor = toNumberOrNull(it.valor) ?? 0;
    out.push({
      id,
      registro_caja_id,
      convenio_id,
      nombre_convenio,
      cantidad,
      valor,
      creado_en: toStringOrNull(it.creado_en ?? it.creadoEn) ?? null,
    });
  }
  return out;
}

/** Componente */
export default function ViewCajaPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [registro, setRegistro] = useState<Registro | null>(null);
  const [convenios, setConvenios] = useState<ConvenioDetalle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Id inválido");
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const token = getToken();
        const res = await fetch(`http://localhost:3000/api/caja/${id}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as Record<
            string,
            unknown
          >;
          throw new Error(
            String(body.mensaje ?? body.message ?? "Error al cargar registro")
          );
        }

        const body = (await res
          .json()
          .catch(() => ({}))) as RegistroCajaResponse;

        const regNormal = normalizeRegistro(body.registro ?? {});
        if (!regNormal) {
          setError("Respuesta del servidor no contiene registro válido");
        } else {
          setRegistro(regNormal);
        }

        setConvenios(normalizeConvenios(body.convenios ?? []));
      } catch (err) {
        console.error(err);
        setError((err as Error).message || "Error al cargar registro");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onPrint = () => {
    window.print();
  };

  const fmt = (v?: number | null) =>
    typeof v === "number"
      ? v.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "0.00";

  if (loading) return <div style={{ padding: 16 }}>Cargando...</div>;
  if (error) return <div style={{ padding: 16, color: "red" }}>{error}</div>;
  if (!registro)
    return <div style={{ padding: 16 }}>Registro no encontrado</div>;

  return (
    <div className="view-container">
      <div className="view-toolbar">
        <button onClick={() => navigate(-1)}>Volver</button>
        <button onClick={onPrint}>Imprimir (ticket 58mm)</button>
      </div>

      <div
        className="receipt"
        role="region"
        aria-label={`Registro de caja ${registro.id}`}
      >
        <div className="rc-header">
          <div className="rc-title">{registro.restaurante}</div>
          <div className="rc-sub">Registro de Caja #{registro.id}</div>
          <div className="rc-sub-sm">
            {registro.fecha_registro
              ? new Date(registro.fecha_registro).toLocaleString()
              : ""}
          </div>
        </div>

        <hr />

        <div className="rc-row">
          <div>Turno:</div>
          <div>{registro.turno || "-"}</div>
        </div>
        <div className="rc-row">
          <div>Cajero:</div>
          <div>{registro.cajero_nombre ?? "-"}</div>
        </div>
        <div className="rc-row">
          <div>Cédula:</div>
          <div>{registro.cajero_cedula ?? "-"}</div>
        </div>

        <hr />

        <div className="rc-row two-cols">
          <div>Venta total registrada:</div>
          <div>{fmt(registro.venta_total_registrada ?? null)}</div>
        </div>

        <div className="rc-row two-cols">
          <div>Efectivo en caja:</div>
          <div>{fmt(registro.efectivo_en_caja ?? null)}</div>
        </div>

        <div className="rc-row two-cols">
          <div>Tarjetas (valor):</div>
          <div>{fmt(registro.tarjetas ?? null)}</div>
        </div>

        <div className="rc-row two-cols">
          <div>Cant. tarjetas:</div>
          <div>{registro.tarjetas_cantidad ?? 0}</div>
        </div>

        <div className="rc-row two-cols">
          <div>Convenios (total):</div>
          <div>{fmt(registro.convenios ?? null)}</div>
        </div>

        <div className="rc-row">
          <div className="rc-section-title">Convenios (detalle):</div>
        </div>

        <div className="rc-convenios">
          {convenios.length === 0 && (
            <div className="rc-empty">Sin convenios</div>
          )}
          {convenios.map((c) => (
            <div
              key={`${c.id ?? c.nombre_convenio}-${c.convenio_id ?? ""}`}
              className="rc-conv-row"
            >
              <div className="rc-conv-name">
                {c.nombre_convenio ?? `#${c.convenio_id ?? ""}`}
              </div>
              <div className="rc-conv-cant">{c.cantidad}</div>
              <div className="rc-conv-val">{fmt(c.valor)}</div>
            </div>
          ))}
        </div>

        <hr />

        <div className="rc-row two-cols">
          <div>Bonos Sodexo:</div>
          <div>{fmt(registro.bonos_sodexo ?? null)}</div>
        </div>

        {/* Línea divisora clara entre BONOS y PAGOS INTERNOS */}
        <div style={{ width: "100%", margin: "6px 0" }}>
          <div
            style={{ borderTop: "2px solid #ccc", height: 0 }}
            aria-hidden="true"
          />
        </div>

        <div className="rc-row two-cols">
          <div>Pagos internos:</div>
          <div>{fmt(registro.pagos_internos ?? null)}</div>
        </div>

        <hr />

        {/* -- AÑADIDO: diferencia y estado (resaltado) -- */}
        <div className="rc-row two-cols">
          <div>DIFERENCIA:</div>
          <div className="rc-diferencia">
            {fmt(registro.diferencia ?? null)}
          </div>
        </div>

        <div className="rc-row">
          <div>ESTADO:</div>
          <div className="rc-estado">
            {(registro.estado ?? "-").toUpperCase()}
          </div>
        </div>

        <hr />

        <div className="rc-row">
          <div>Observación:</div>
          <div>{registro.observacion ?? "-"}</div>
        </div>

        <div style={{ height: 8 }} />
        <div className="rc-footer">
          Gracias por utilizar el sistema creado por Jesús Cañón
        </div>
      </div>
    </div>
  );
}
