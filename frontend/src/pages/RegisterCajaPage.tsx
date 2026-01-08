// frontend/src/pages/RegisterCajaPage.tsx
import React, { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getToken, getUser } from "../utils/authService";
import "./RegisterCajaPage.css";

/* -------------------- Tipos -------------------- */
type Turno = "" | "A" | "B" | "C" | "D";

interface FormState {
  restaurante: string;
  sucursal_id?: number | null;
  turno: Turno;
  fecha_registro: string; // yyyy-mm-dd
  hora_registro: string; // HH:MM
  ventaTotalRegistrada: string;
  efectivoEnCaja: string;
  tarjetas: string;
  tarjetas_cantidad: string;
  convenios: string;
  convenios_cantidad: string;
  bonos_sodexo: string;
  bonos_sodexo_cantidad: string;
  pagos_internos: string;
  pagos_internos_cantidad: string;
  cajero_nombre: string;
  cajero_cedula: string;
  observacion: string;
}

type ConvenioOption = { id: number; nombre: string };
type ConvenioEntry = {
  convenio_id?: number | null;
  nombre_convenio?: string | null;
  cantidad: string;
  valor: string;
};

type ApiCajaResponse = {
  registro?: Record<string, unknown>;
  convenios?: Array<Record<string, unknown>>;
  mensaje?: string;
};

/* -------------------- Helpers (pegar aquí) -------------------- */

/**
 * formatIntegerDisplay
 * - recibe string con posible basura y devuelve string con separador de miles '.' (ej. "1234" -> "1.234")
 * - si input vacío devuelve ""
 */
const formatIntegerDisplay = (input: string): string => {
  let s = String(input ?? "");
  // quitar todo excepto dígitos
  s = s.replace(/\D+/g, "");
  if (s === "") return "";
  // quitar ceros a la izquierda salvo si es solo "0"
  s = s.replace(/^0+(?=\d)/, "");
  if (s === "") s = "0";
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/**
 * sanitizeInteger
 * - deja solo dígitos
 */
const sanitizeInteger = (value: string): string =>
  String(value ?? "").replace(/\D+/g, "");

/**
 * handleNumericFocus: si valor === "0" -> lo deja vacío
 */
const handleNumericFocus = (value: string, setter: (v: string) => void) => {
  if (value === "0") setter("");
};

/**
 * handleNumericBlurInteger:
 * - normaliza integer (quita caracteres no numéricos)
 * - si queda vacío pone "0"
 * - formatea con separador de miles
 */
const handleNumericBlurInteger = (
  value: string,
  setter: (v: string) => void
) => {
  const sanitized = sanitizeInteger(String(value ?? ""));
  const final = sanitized === "" ? "0" : sanitized;
  setter(formatIntegerDisplay(final));
};

/**
 * integerOnChangeFactory
 * - devuelve un onChange que formatea en tiempo real (miles)
 */
const integerOnChangeFactory =
  (setter: (v: string) => void) =>
  (e: React.ChangeEvent<HTMLInputElement> | string) => {
    const val = typeof e === "string" ? e : e.target.value;
    const sanitized = sanitizeInteger(val);
    const formatted = sanitized === "" ? "" : formatIntegerDisplay(sanitized);
    setter(formatted);
  };

/**
 * parseFormattedInteger
 * - convierte "1.234" -> 1234 (Number)
 */
const parseFormattedInteger = (display: string): number => {
  if (!display && display !== "0") return 0;
  const cleaned = String(display).replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
};

/* -------------------- Helpers utilitarios del componente -------------------- */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function extractString(obj: unknown, keys: string[]): string | null {
  if (!isObject(obj)) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v;
    if (typeof v === "number") return String(v);
  }
  return null;
}
function extractNumber(obj: unknown, keys: string[]): number | null {
  if (!isObject(obj)) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const parsed = Number(String(v).replace(",", "."));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

/* -------------------- Componente -------------------- */
export default function RegisterCajaPage(): ReactElement {
  const navigate = useNavigate();
  const { id: paramId } = useParams<{ id?: string }>();
  const editingId = paramId ? Number(paramId) : null;

  // FECHA HOY (yyyy-mm-dd) y hora actual (HH:MM)
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const nowTime = `${hh}:${mi}`;

  const rawUser = getUser();
  const user =
    rawUser && typeof rawUser === "object"
      ? (rawUser as Record<string, unknown>)
      : null;
  const role = ((user?.rol ?? user?.role) as string | undefined)?.toLowerCase();

  const [form, setForm] = useState<FormState>({
    restaurante: (user?.restaurante as string) ?? "",
    sucursal_id:
      typeof user?.sucursal_id === "number"
        ? (user.sucursal_id as number)
        : null,
    turno: "",
    fecha_registro: todayStr,
    hora_registro: nowTime,
    ventaTotalRegistrada: "0",
    efectivoEnCaja: "0",
    tarjetas: "0",
    tarjetas_cantidad: "0",
    convenios: "0",
    convenios_cantidad: "0",
    bonos_sodexo: "0",
    bonos_sodexo_cantidad: "0",
    pagos_internos: "0",
    pagos_internos_cantidad: "0",
    cajero_nombre: (user?.nombre as string) ?? "",
    cajero_cedula: (user?.cedula as string) ?? "",
    observacion: "",
  });

  const [conveniosOpts, setConveniosOpts] = useState<ConvenioOption[]>([]);
  const [convenioEntries, setConvenioEntries] = useState<ConvenioEntry[]>(
    Array.from({ length: 3 }, () => ({
      convenio_id: null,
      nombre_convenio: null,
      cantidad: "0",
      valor: "0",
    }))
  );

  const [sucursalesOpts, setSucursalesOpts] = useState<
    { id: number; nombre: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  /* ---------- CARGAR LISTAS (sucursales, convenios) ---------- */
  useEffect(() => {
    // cargar convenios
    (async () => {
      try {
        const token = getToken();
        const res = await fetch("/api/convenios", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) return;
        const b = (await res.json().catch(() => null)) as unknown;
        const candidate =
          isObject(b) && Array.isArray(b.convenios)
            ? b.convenios
            : Array.isArray(b)
            ? b
            : [];
        if (Array.isArray(candidate)) {
          const mapped = candidate
            .map((c) => {
              if (!isObject(c)) return null;
              const id = extractNumber(c, ["id", "_id"]) ?? 0;
              const nombre = extractString(c, ["nombre"]) ?? "";
              return { id: Math.trunc(Number(id)), nombre };
            })
            .filter(
              (x): x is ConvenioOption => !!x && typeof x.nombre === "string"
            );
          setConveniosOpts(mapped);
        }
      } catch (err) {
        console.error("Error cargando convenios:", err);
      }
    })();

    // cargar sucursales
    (async () => {
      try {
        const token = getToken();
        const res = await fetch("/api/sucursales", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) return;
        const b = (await res.json().catch(() => null)) as unknown;
        const candidate =
          isObject(b) && Array.isArray(b.sucursales)
            ? b.sucursales
            : isObject(b) && Array.isArray(b.rows)
            ? b.rows
            : Array.isArray(b)
            ? b
            : [];
        if (Array.isArray(candidate)) {
          const mapped = candidate
            .map((s) => {
              if (!isObject(s)) return null;
              const id = extractNumber(s, ["id", "sucursal_id", "_id"]) ?? 0;
              const nombre =
                extractString(s, [
                  "nombre",
                  "sucursal_nombre",
                  "restaurante",
                ]) ?? "";
              return { id: Math.trunc(Number(id)), nombre };
            })
            .filter(
              (x): x is { id: number; nombre: string } =>
                !!x && typeof x.nombre === "string" && x.nombre !== ""
            );

          setSucursalesOpts(mapped);

          const userSucursalId =
            typeof user?.sucursal_id === "number" ? user.sucursal_id : null;
          if (role !== "administrador" && userSucursalId && !form.restaurante) {
            const found = mapped.find((o) => o.id === userSucursalId);
            if (found) {
              setForm((s) => ({
                ...s,
                restaurante: found.nombre,
                sucursal_id: found.id,
              }));
            }
          }
        }
      } catch (err) {
        console.error("Error cargando sucursales:", err);
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- SI ESTAMOS EDITANDO: CARGAR DATOS ---------- */
  useEffect(() => {
    if (!editingId) return;
    setLoading(true);
    (async () => {
      try {
        const token = getToken();
        const res = await fetch(`/api/caja/${editingId}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Error cargando registro: ${res.status} ${text}`);
        }
        const body = (await res.json().catch(() => ({}))) as ApiCajaResponse;
        const reg = body.registro ?? {};

        // convert numeric values to formatted string (thousands) and quantities as integers formatted
        const formatNum = (n: number | null | undefined) =>
          n == null ? "0" : formatIntegerDisplay(String(Math.round(n)));

        setForm((s) => ({
          ...s,
          restaurante: (extractString(reg, [
            "restaurante",
            "sucursal_nombre",
            "nombre",
          ]) ?? String(reg["restaurante"] ?? "")) as string,
          sucursal_id:
            typeof reg["sucursal_id"] === "number"
              ? (reg["sucursal_id"] as number)
              : s.sucursal_id ?? null,
          turno: (extractString(reg, ["turno"]) ?? "") as Turno,
          fecha_registro:
            (reg["fecha_registro"]
              ? new Date(String(reg["fecha_registro"]))
                  .toISOString()
                  .slice(0, 10)
              : todayStr) ?? todayStr,
          hora_registro:
            (reg["hora_registro"] as string) ??
            (reg["created_at"]
              ? new Date(String(reg["created_at"])).toISOString().slice(11, 16)
              : nowTime),
          ventaTotalRegistrada: formatNum(
            extractNumber(reg, [
              "venta_total_registrada",
              "ventaTotal",
              "venta",
            ]) ?? 0
          ),
          efectivoEnCaja: formatNum(
            extractNumber(reg, ["efectivo_en_caja", "efectivo"]) ?? 0
          ),
          tarjetas: formatNum(extractNumber(reg, ["tarjetas"]) ?? 0),
          tarjetas_cantidad: formatNum(
            extractNumber(reg, ["tarjetas_cantidad"]) ?? 0
          ),
          convenios: formatNum(extractNumber(reg, ["convenios"]) ?? 0),
          convenios_cantidad: formatNum(
            extractNumber(reg, ["convenios_cantidad"]) ?? 0
          ),
          bonos_sodexo: formatNum(extractNumber(reg, ["bonos_sodexo"]) ?? 0),
          bonos_sodexo_cantidad: formatNum(
            extractNumber(reg, ["bonos_sodexo_cantidad"]) ?? 0
          ),
          pagos_internos: formatNum(
            extractNumber(reg, ["pagos_internos"]) ?? 0
          ),
          pagos_internos_cantidad: formatNum(
            extractNumber(reg, ["pagos_internos_cantidad"]) ?? 0
          ),
          cajero_nombre: String(reg["cajero_nombre"] ?? s.cajero_nombre),
          cajero_cedula: String(reg["cajero_cedula"] ?? s.cajero_cedula),
          observacion: String(reg["observacion"] ?? s.observacion ?? ""),
        }));

        // convenios asociados
        const convs = Array.isArray(body.convenios) ? body.convenios : [];
        if (Array.isArray(convs) && convs.length > 0) {
          const mapped = convs.map((c) => ({
            convenio_id:
              typeof c["convenio_id"] === "number"
                ? (c["convenio_id"] as number)
                : null,
            nombre_convenio:
              extractString(c, ["nombre_convenio"]) ??
              extractString(c, ["nombre"]) ??
              null,
            cantidad: formatIntegerDisplay(
              String(extractNumber(c, ["cantidad"]) ?? 0)
            ),
            valor: formatIntegerDisplay(
              String(Math.round(extractNumber(c, ["valor"]) ?? 0))
            ),
          })) as ConvenioEntry[];
          setConvenioEntries(mapped);
        }
      } catch (err) {
        console.error(err);
        setError("No se pudo cargar el registro para edición.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  /* ---------- Convenios entradas (UI) ---------- */
  const addConvenioEntry = () => {
    setConvenioEntries((prev) =>
      prev.length >= 12
        ? prev
        : [
            ...prev,
            {
              convenio_id: null,
              nombre_convenio: null,
              cantidad: "0",
              valor: "0",
            },
          ]
    );
  };
  const removeConvenioEntry = (index: number) => {
    setConvenioEntries((prev) => {
      if (prev.length <= 1) return prev;
      const copy = prev.slice();
      copy.splice(index, 1);
      return copy;
    });
  };
  const handleEntryChange = (
    index: number,
    field: keyof ConvenioEntry,
    value: string
  ) => {
    setConvenioEntries((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };
  const handleEntrySelect = (index: number, convenioIdStr: string) => {
    const id = convenioIdStr ? Number(convenioIdStr) : null;
    const found = conveniosOpts.find((c) => c.id === id);
    setConvenioEntries((prev) =>
      prev.map((it, i) =>
        i === index
          ? {
              ...it,
              convenio_id: id ?? null,
              nombre_convenio: found ? found.nombre : it.nombre_convenio,
            }
          : it
      )
    );
  };

  /* ---------- Recalcular totales de convenios en tiempo real ---------- */
  useEffect(() => {
    // suma cantidades y valores de convenioEntries y los pone en form (se almacenan formateados)
    const totalCantidad = convenioEntries.reduce((acc, it) => {
      const n =
        parseInt(String(it.cantidad).replace(/\./g, "").replace(",", ".")) || 0;
      return acc + Math.max(0, Math.round(n));
    }, 0);
    const totalValor = convenioEntries.reduce((acc, it) => {
      const v =
        parseInt(String(it.valor).replace(/\./g, "").replace(",", ".")) || 0;
      return acc + Math.round(v);
    }, 0);

    // actualizamos los campos readOnly de form (formateados con miles)
    setForm((s) => ({
      ...s,
      convenios: formatIntegerDisplay(String(Math.round(totalValor))),
      convenios_cantidad: formatIntegerDisplay(
        String(Math.round(totalCantidad))
      ),
    }));
  }, [convenioEntries]);

  /* ---------- Manejo formulario ---------- */
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const name = e.target.name as keyof FormState;
    const value = e.target.value;
    setForm((s) => ({ ...s, [name]: value } as FormState));
  };

  const handleSucursalSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      setForm((s) => ({ ...s, restaurante: "", sucursal_id: null }));
      return;
    }
    const id = Number(val);
    const found = sucursalesOpts.find((s) => s.id === id);
    setForm((s) => ({
      ...s,
      sucursal_id: id,
      restaurante: found ? found.nombre : s.restaurante,
    }));
  };

  /* ---------- Envío (POST o PATCH) ---------- */
  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setMensaje(null);

    // validaciones simples (igual que tenías)
    if (!form.turno) {
      setError("Selecciona un turno");
      return;
    }
    if (!form.cajero_nombre || !form.cajero_cedula) {
      setError("Nombre y cédula del cajero son obligatorios");
      return;
    }
    if (role === "administrador" && (!form.sucursal_id || !form.restaurante)) {
      setError("Selecciona una sucursal (administrador)");
      return;
    }
    if (role !== "administrador" && (!form.restaurante || !form.sucursal_id)) {
      setError(
        "Restaurante/sucursal no definido para el cajero (contacte al admin)"
      );
      return;
    }

    // preparar convenios_items (parsear valores formateados)
    const convenios_items = convenioEntries
      .map((it) => {
        const cantidad = Math.max(
          0,
          Math.round(
            parseInt(
              String(it.cantidad).replace(/\./g, "").replace(",", ".")
            ) || 0
          )
        );
        const valor = Math.round(
          parseInt(String(it.valor).replace(/\./g, "").replace(",", ".")) || 0
        );
        return {
          convenio_id: it.convenio_id ?? null,
          nombre_convenio: it.nombre_convenio ?? null,
          cantidad,
          valor,
        };
      })
      .filter(
        (it) =>
          it.cantidad > 0 ||
          it.valor > 0 ||
          it.convenio_id !== null ||
          it.nombre_convenio
      );

    // parsear/normalizar números
    const ventaTotalNum = parseFormattedInteger(form.ventaTotalRegistrada) || 0;
    const efectivoNum = parseFormattedInteger(form.efectivoEnCaja) || 0;
    const tarjetasNum = parseFormattedInteger(form.tarjetas) || 0;
    const tarjetasCantidadNum =
      Math.round(parseFormattedInteger(form.tarjetas_cantidad) || 0) || 0;
    const conveniosNum = parseFormattedInteger(form.convenios) || 0;
    const conveniosCantidadNum =
      Math.round(parseFormattedInteger(form.convenios_cantidad) || 0) || 0;
    const bonosNum = parseFormattedInteger(form.bonos_sodexo) || 0;
    const bonosCantidadNum =
      Math.round(parseFormattedInteger(form.bonos_sodexo_cantidad) || 0) || 0;
    const pagosInternosNum = parseFormattedInteger(form.pagos_internos) || 0;
    const pagosInternosCantidadNum =
      Math.round(parseFormattedInteger(form.pagos_internos_cantidad) || 0) || 0;

    // PAYLOAD en snake_case (solo este)
    const payloadSnakeOnly: Record<string, unknown> = {
      restaurante: form.restaurante,
      turno: form.turno,
      fecha_registro: form.fecha_registro, // yyyy-mm-dd
      hora_registro: form.hora_registro, // HH:MM
      // IMPORTANT: enviar venta_total_registrada en snake_case y como número entero redondeado
      venta_total_registrada: Math.round(Number(ventaTotalNum || 0)),
      efectivo_en_caja: Math.round(Number(efectivoNum || 0)),
      tarjetas: Math.round(Number(tarjetasNum || 0)),
      tarjetas_cantidad: Math.round(Number(tarjetasCantidadNum || 0)),
      convenios: Math.round(Number(conveniosNum || 0)),
      convenios_cantidad: Math.round(Number(conveniosCantidadNum || 0)),
      convenios_items: convenios_items.length ? convenios_items : undefined,
      bonos_sodexo: Math.round(Number(bonosNum || 0)),
      bonos_sodexo_cantidad: Math.round(Number(bonosCantidadNum || 0)),
      pagos_internos: Math.round(Number(pagosInternosNum || 0)),
      pagos_internos_cantidad: Math.round(
        Number(pagosInternosCantidadNum || 0)
      ),
      cajero_nombre: form.cajero_nombre || "",
      cajero_cedula: form.cajero_cedula || "",
      // enviar observacion como string (evita null)
      observacion: form.observacion ?? "",
    };

    if (
      typeof form.sucursal_id === "number" &&
      !Number.isNaN(form.sucursal_id)
    ) {
      payloadSnakeOnly.sucursal_id = Math.trunc(form.sucursal_id);
    }

    // DEBUG (temporal): ver en consola exactamente lo que vas a enviar
    console.debug(
      "[RegisterCajaPage] PATCH body (snake_case):",
      payloadSnakeOnly
    );

    //log stringificado para ver detalles de escape
    console.log(
      "[RegisterCajaPage] PATCH request payload (stringified):",
      JSON.stringify(payloadSnakeOnly)
    );

    setSaving(true);
    try {
      const token = getToken();
      let res: Response;

      if (editingId) {
        res = await fetch(`/api/caja/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payloadSnakeOnly),
        });
      } else {
        res = await fetch("/api/caja/registrar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payloadSnakeOnly),
        });
      }

      // intentar parsear JSON o texto
      let body: ApiCajaResponse | null = null;
      try {
        // res.json() puede lanzar; .catch(() => null) protege pero devolvemos null si no es JSON
        body = (await res.json().catch(() => null)) as ApiCajaResponse | null;
      } catch {
        // ignore
      }

      if (!res.ok) {
        // evitar `any` — tratamos body como Record<string, unknown>
        const b = (body ?? null) as Record<string, unknown> | null;
        let serverMsg: string | undefined = undefined;

        if (b) {
          if (typeof b["mensaje"] === "string" && b["mensaje"] !== "") {
            serverMsg = String(b["mensaje"]);
          } else if (typeof b["message"] === "string" && b["message"] !== "") {
            serverMsg = String(b["message"]);
          }
        }

        if (!serverMsg) {
          const txt = await res.text().catch(() => "");
          serverMsg = txt || `Error (status ${res.status})`;
        }

        // LOG completo para debugging en consola (muy útil)
        console.error(
          `[RegisterCajaPage] ${editingId ? "PATCH" : "POST"} error:`,
          res.status,
          "response body:",
          body,
          "response text (fallback):",
          await res.text().catch(() => "")
        );

        setError(String(serverMsg));
        return;
      }

      // ------- AQUI: mostrar mensaje de éxito y NAVEGAR DESPUÉS -------
      const successMsg =
        body?.mensaje ??
        (editingId
          ? "Registro actualizado exitosamente"
          : "Registro creado exitosamente");

      setMensaje(successMsg);

      // Mostrar mensaje breve, luego navegar. 1400ms es razonable.
      setTimeout(() => {
        setMensaje(null);
        if (role === "administrador") navigate("/admin/registros");
        else navigate("/cajero/registros");
      }, 1400);

      // ---------------------------------------------------------------
    } catch (err) {
      console.error("Error submit:", err);
      setError("Error de conexión al servidor");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- RENDERS ---------- */

  return (
    <div className="rcp-container">
      <h1 className="rcp-title">
        {editingId ? "Editar registro" : "Caja Registradora"}
      </h1>

      <form onSubmit={onSubmit} className="rcp-form">
        <div className="rcp-toprow">
          <label className="rcp-field">
            Restaurante:
            {role === "administrador" ? (
              <select
                name="sucursal_id"
                value={form.sucursal_id ? String(form.sucursal_id) : ""}
                onChange={handleSucursalSelect}
                required
              >
                <option value="">-- Seleccionar sucursales --</option>
                {sucursalesOpts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="restaurante"
                value={form.restaurante}
                placeholder="Restaurante"
                readOnly
                required
              />
            )}
          </label>

          <label className="rcp-field">
            Fecha:
            <input
              name="fecha_registro"
              type="date"
              value={form.fecha_registro}
              onChange={handleChange}
              required
            />
          </label>

          <label className="rcp-field">
            Hora:
            <input
              name="hora_registro"
              type="time"
              value={form.hora_registro}
              onChange={handleChange}
              required
            />
          </label>

          <label className="rcp-field">
            Turno:
            <select
              name="turno"
              value={form.turno}
              onChange={handleChange}
              required
            >
              <option value="">Seleccionar</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>
        </div>

        <fieldset className="rcp-section">
          <legend className="rcp-legend">Cajero</legend>
          <div className="rcp-cajero-row">
            <label>
              Nombre cajero:
              <input
                name="cajero_nombre"
                value={form.cajero_nombre}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Cédula cajero:
              <input
                name="cajero_cedula"
                value={form.cajero_cedula}
                onChange={handleChange}
                required
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="rcp-section">
          <legend className="rcp-legend">Ingresos</legend>
          <div className="rcp-ingresos-grid">
            <div className="rcp-ingreso-item">
              <label>Venta total registrada</label>
              <input
                name="ventaTotalRegistrada"
                value={form.ventaTotalRegistrada}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, ventaTotalRegistrada: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.ventaTotalRegistrada, (v) =>
                    setForm((s) => ({ ...s, ventaTotalRegistrada: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.ventaTotalRegistrada, (v) =>
                    setForm((s) => ({ ...s, ventaTotalRegistrada: v }))
                  )
                }
                required
                inputMode="numeric"
              />
            </div>

            <div className="rcp-ingreso-item">
              <label>Efectivo en caja</label>
              <input
                name="efectivoEnCaja"
                value={form.efectivoEnCaja}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, efectivoEnCaja: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.efectivoEnCaja, (v) =>
                    setForm((s) => ({ ...s, efectivoEnCaja: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.efectivoEnCaja, (v) =>
                    setForm((s) => ({ ...s, efectivoEnCaja: v }))
                  )
                }
                inputMode="numeric"
              />
            </div>

            <div className="rcp-ingreso-item">
              <label>Tarjetas (valor)</label>
              <input
                name="tarjetas"
                value={form.tarjetas}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, tarjetas: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.tarjetas, (v) =>
                    setForm((s) => ({ ...s, tarjetas: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.tarjetas, (v) =>
                    setForm((s) => ({ ...s, tarjetas: v }))
                  )
                }
                inputMode="numeric"
              />
            </div>

            <div className="rcp-ingreso-item">
              <label>Cant. tarjetas</label>
              <input
                name="tarjetas_cantidad"
                value={form.tarjetas_cantidad}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, tarjetas_cantidad: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.tarjetas_cantidad, (v) =>
                    setForm((s) => ({ ...s, tarjetas_cantidad: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.tarjetas_cantidad, (v) =>
                    setForm((s) => ({ ...s, tarjetas_cantidad: v }))
                  )
                }
                inputMode="numeric"
              />
            </div>

            <div className="rcp-ingreso-item">
              <label>Convenios (valor)</label>
              <input
                name="convenios"
                value={form.convenios}
                onChange={() => {}}
                readOnly
              />
            </div>

            <div className="rcp-ingreso-item">
              <label>Cant. convenios</label>
              <input
                name="convenios_cantidad"
                value={form.convenios_cantidad}
                onChange={() => {}}
                readOnly
              />
            </div>

            <div className="rcp-ingreso-item">
              <label>Bonos Sodexo (valor)</label>
              <input
                name="bonos_sodexo"
                value={form.bonos_sodexo}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, bonos_sodexo: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.bonos_sodexo, (v) =>
                    setForm((s) => ({ ...s, bonos_sodexo: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.bonos_sodexo, (v) =>
                    setForm((s) => ({ ...s, bonos_sodexo: v }))
                  )
                }
                inputMode="numeric"
              />
            </div>

            <div className="rcp-ingreso-item">
              <label>Cant. bonos</label>
              <input
                name="bonos_sodexo_cantidad"
                value={form.bonos_sodexo_cantidad}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, bonos_sodexo_cantidad: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.bonos_sodexo_cantidad, (v) =>
                    setForm((s) => ({ ...s, bonos_sodexo_cantidad: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.bonos_sodexo_cantidad, (v) =>
                    setForm((s) => ({ ...s, bonos_sodexo_cantidad: v }))
                  )
                }
                inputMode="numeric"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="rcp-section">
          <legend className="rcp-legend">Convenios (detalle)</legend>
          <div className="rcp-convenios-list">
            {convenioEntries.map((entry, idx) => (
              <div className="rcp-convenio-item" key={idx}>
                <div className="rcp-convenio-select">
                  <label style={{ display: "block" }}>
                    Convenio:
                    <select
                      value={entry.convenio_id ?? ""}
                      onChange={(e) => handleEntrySelect(idx, e.target.value)}
                    >
                      <option value="">-- seleccionar --</option>
                      {conveniosOpts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Cantidad:
                  <input
                    type="text"
                    value={entry.cantidad}
                    onChange={(e) =>
                      handleEntryChange(
                        idx,
                        "cantidad",
                        formatIntegerDisplay(
                          String(sanitizeInteger(e.target.value))
                        )
                      )
                    }
                    onFocus={() =>
                      handleEntryChange(
                        idx,
                        "cantidad",
                        entry.cantidad === "0" ? "" : entry.cantidad
                      )
                    }
                    onBlur={() =>
                      handleEntryChange(
                        idx,
                        "cantidad",
                        formatIntegerDisplay(
                          String(sanitizeInteger(entry.cantidad || "")) || "0"
                        )
                      )
                    }
                    inputMode="numeric"
                  />
                </label>

                <label>
                  Valor (convenio total):
                  <input
                    type="text"
                    value={entry.valor}
                    onChange={(e) =>
                      handleEntryChange(
                        idx,
                        "valor",
                        formatIntegerDisplay(
                          String(sanitizeInteger(e.target.value))
                        )
                      )
                    }
                    onFocus={() =>
                      handleEntryChange(
                        idx,
                        "valor",
                        entry.valor === "0" ? "" : entry.valor
                      )
                    }
                    onBlur={() =>
                      handleEntryChange(
                        idx,
                        "valor",
                        formatIntegerDisplay(
                          String(sanitizeInteger(entry.valor || "")) || "0"
                        )
                      )
                    }
                    inputMode="numeric"
                  />
                </label>

                <div className="rcp-convenio-actions">
                  <button
                    type="button"
                    onClick={() => removeConvenioEntry(idx)}
                    disabled={convenioEntries.length <= 1}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}

            <div className="rcp-add-btn-row">
              <button
                type="button"
                onClick={addConvenioEntry}
                disabled={convenioEntries.length >= 12}
              >
                Agregar convenio ({convenioEntries.length}/12)
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset className="rcp-section">
          <legend className="rcp-legend">Egresos</legend>
          <div className="rcp-row">
            <label>
              Pagos internos (valor):
              <input
                name="pagos_internos"
                value={form.pagos_internos}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, pagos_internos: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.pagos_internos, (v) =>
                    setForm((s) => ({ ...s, pagos_internos: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.pagos_internos, (v) =>
                    setForm((s) => ({ ...s, pagos_internos: v }))
                  )
                }
                inputMode="numeric"
              />
            </label>

            <label>
              Cant. pagos internos:
              <input
                name="pagos_internos_cantidad"
                value={form.pagos_internos_cantidad}
                onChange={integerOnChangeFactory((v) =>
                  setForm((s) => ({ ...s, pagos_internos_cantidad: v }))
                )}
                onFocus={() =>
                  handleNumericFocus(form.pagos_internos_cantidad, (v) =>
                    setForm((s) => ({ ...s, pagos_internos_cantidad: v }))
                  )
                }
                onBlur={() =>
                  handleNumericBlurInteger(form.pagos_internos_cantidad, (v) =>
                    setForm((s) => ({ ...s, pagos_internos_cantidad: v }))
                  )
                }
                inputMode="numeric"
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="rcp-section">
          <legend className="rcp-legend">Observaciones</legend>
          <textarea
            name="observacion"
            value={form.observacion}
            onChange={handleChange}
            rows={3}
          />
        </fieldset>

        {loading && (
          <div style={{ marginBottom: 12, color: "#333" }}>
            Cargando datos del registro...
          </div>
        )}

        {error && <div className="rcp-error">{error}</div>}
        {mensaje && <div className="rcp-success">{mensaje}</div>}

        <div className="rcp-actions">
          <button type="submit" disabled={saving || loading}>
            {saving
              ? "Guardando..."
              : editingId
              ? "Actualizar registro"
              : "Guardar registro"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (role === "administrador") navigate("/admin/registros");
              else navigate("/cajero/registros");
            }}
            disabled={loading}
          >
            Ver registros
          </button>
        </div>
      </form>
    </div>
  );
}
