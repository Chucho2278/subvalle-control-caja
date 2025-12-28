// frontend/src/pages/RegistrosPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import CajeroMenu from "../components/CajeroMenu";
import { getToken, getUser } from "../utils/authService";
import { useNavigate } from "react-router-dom";

/** Tipos mínimos para la UI */
type RegistroUI = {
  id: number;
  restaurante: string;
  fechaRegistro?: string | null;
  turno?: string | null;
  ventaTotalRegistrada?: number | null;
  efectivoEnCaja?: number | null;
  estado?: string | null;
};

type SucursalOpt = { id: number; nombre: string };

/* -------------------- helpers de tipo -------------------- */
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
      const parsed = Number(String(v).replace(",", ".").replace(/\s/g, ""));
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function extractDateIso(obj: unknown, keys: string[]): string | null {
  const cand = extractString(obj, keys);
  if (!cand) return null;

  if (/^\d+$/.test(cand)) {
    const num = Number(cand);
    const d = new Date(num);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  const trimmed = cand.split(".")[0];
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d.toISOString();

  return cand;
}

/* intenta convertir respuesta de /api/sucursales a SucursalOpt[] */
function parseSucursalesResponse(raw: unknown): SucursalOpt[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((it) => {
        if (!isObject(it)) return null;
        const id =
          typeof it.id === "number"
            ? it.id
            : typeof it.sucursal_id === "number"
            ? it.sucursal_id
            : Number((it as Record<string, unknown>).id ?? 0);
        const nombre =
          extractString(it, ["nombre", "sucursal_nombre", "restaurante"]) ??
          String(id ?? "");
        if (!nombre) return null;
        return { id: Math.trunc(Number(id)), nombre };
      })
      .filter((x): x is SucursalOpt => x !== null);
  }

  if (isObject(raw)) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.sucursales))
      return parseSucursalesResponse(obj.sucursales);
    if (Array.isArray(obj.rows))
      return parseSucursalesResponse(obj.rows as unknown[]);
    if (Array.isArray(obj.data))
      return parseSucursalesResponse(obj.data as unknown[]);
  }

  return [];
}

/* -------------------- util fechas -------------------- */
function formatDateYMD(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Diferencia en meses enteros entre dos fechas YYYY-MM-DD.
 * Calcula meses completos: p.ej. 2025-01-15 -> 2025-04-14 = 2 meses (porque 14 < 15)
 * Devuelve Infinity si no puede parsear.
 */
function monthsBetween(fromYmd: string, toYmd: string): number {
  try {
    const fParts = fromYmd.split("-").map((s) => Number(s));
    const tParts = toYmd.split("-").map((s) => Number(s));
    if (fParts.length !== 3 || tParts.length !== 3) return Infinity;
    const f = new Date(fParts[0], fParts[1] - 1, fParts[2]);
    const t = new Date(tParts[0], tParts[1] - 1, tParts[2]);
    if (isNaN(f.getTime()) || isNaN(t.getTime())) return Infinity;
    // si to < from -> devolver -1 (para que la validación de orden lo atrape antes)
    if (t.getTime() < f.getTime()) return -1;
    let months =
      (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth());
    // si el día final es menor al día inicial, restar 1 mes (no cuenta mes completo)
    if (t.getDate() < f.getDate()) months -= 1;
    return months;
  } catch {
    return Infinity;
  }
}

/* -------------------- formato estado -------------------- */
/**
 * Reemplaza ocurrencias numéricas dentro del texto por su versión con separador de miles 'es-CO'.
 * Ej: "caja corta por -10000" -> "caja corta por -10.000"
 */
function formatEstadoText(estado?: string | null) {
  if (!estado) return "-";
  return estado.replace(/-?\d[\d.,]*/g, (numStr) => {
    const cleaned = numStr.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    if (Number.isNaN(n)) return numStr;
    return n.toLocaleString("es-CO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  });
}

/* -------------------- componente -------------------- */
export default function RegistrosPage() {
  const rawUser = getUser();
  const user =
    rawUser && typeof rawUser === "object"
      ? (rawUser as Record<string, unknown>)
      : null;

  const userRole =
    (user?.rol as "cajero" | "administrador" | undefined) ??
    (user?.role as "cajero" | "administrador" | undefined) ??
    undefined;
  const userSucursalId =
    typeof user?.sucursal_id === "number" ? user.sucursal_id : null;

  const navigate = useNavigate();

  // Fechas por defecto: desde = ayer, hasta = hoy
  const today = new Date();
  const todayStr = formatDateYMD(today);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = formatDateYMD(yesterday);

  // state de fechas: por defecto ayer -> hoy (pero NO ejecutamos búsqueda automática)
  const [fromDate, setFromDate] = useState<string>(yesterdayStr);
  const [toDate, setToDate] = useState<string>(todayStr);

  // ahora soportamos múltiples turnos seleccionados
  const [selectedTurnos, setSelectedTurnos] = useState<string[]>([]);

  const [sucursalesOpts, setSucursalesOpts] = useState<SucursalOpt[]>([]);
  const [selectedSucursalIds, setSelectedSucursalIds] = useState<number[]>(
    userRole === "cajero" && userSucursalId ? [userSucursalId] : []
  );

  // estado para abrir/cerrar los dropdowns
  const [openSucursales, setOpenSucursales] = useState(false);
  const [openTurnos, setOpenTurnos] = useState(false);

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(50); // <-- máximo 50 por página solicitado

  const [registros, setRegistros] = useState<RegistroUI[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // refs para cerrar dropdowns al hacer click fuera
  const sucDropdownRef = useRef<HTMLDivElement | null>(null);
  const turnoDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (sucDropdownRef.current && !sucDropdownRef.current.contains(target)) {
        setOpenSucursales(false);
      }
      if (
        turnoDropdownRef.current &&
        !turnoDropdownRef.current.contains(target)
      ) {
        setOpenTurnos(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // cargar sucursales
  useEffect(() => {
    (async () => {
      try {
        const token = getToken();
        const res = await fetch("/api/sucursal", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          setSucursalesOpts([]);
          return;
        }

        const body = await res.json().catch(() => null);
        const candidate: unknown =
          body && typeof body === "object"
            ? Array.isArray((body as Record<string, unknown>).sucursales)
              ? (body as Record<string, unknown>).sucursales
              : Array.isArray((body as Record<string, unknown>).data)
              ? (body as Record<string, unknown>).data
              : Array.isArray((body as Record<string, unknown>).rows)
              ? (body as Record<string, unknown>).rows
              : body
            : body;

        const parsed = parseSucursalesResponse(candidate);
        setSucursalesOpts(parsed);
      } catch {
        setSucursalesOpts([]);
      }
    })();
  }, []);

  // si cajero y tiene sucursal_id, preseleccionar (NO ejecutar fetch aquí)
  useEffect(() => {
    if (
      userRole === "cajero" &&
      userSucursalId &&
      selectedSucursalIds.length === 0
    ) {
      setSelectedSucursalIds([userSucursalId]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, userSucursalId]);

  // toggles sucursal seleccionada
  const toggleSucursal = (id: number) => {
    setSelectedSucursalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTurno = (t: string) => {
    setSelectedTurnos((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  /* ---------------- Reglas de fechas (UX) ---------------- */

  const onChangeFromDate = (value: string) => {
    setFromDate(value);
  };

  const onChangeToDate = (value: string) => {
    setToDate(value);
  };

  /* ---------------- Fetch registros ---------------- */

  const fetchRegistros = useCallback(
    async (pageArg: number = page) => {
      // require both dates to query
      if (!fromDate || !toDate) {
        alert(
          "Selecciona 'Desde' y 'Hasta' antes de buscar (ambas fechas requeridas)."
        );
        return;
      }

      // validar orden
      if (fromDate > toDate) {
        alert("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.");
        return;
      }

      // validar rango máximo 3 meses (según criterio)
      const months = monthsBetween(fromDate, toDate);
      if (months === Infinity) {
        alert("Fechas inválidas. Verifica el formato.");
        return;
      }
      if (months > 3) {
        alert("El rango seleccionado no puede ser mayor a 3 meses.");
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("from", fromDate);
        params.set("to", toDate);
        params.set("page", String(pageArg));
        params.set("limit", String(limit));

        // Turnos
        if (selectedTurnos.length > 0) {
          for (const t of selectedTurnos) params.append("turno", t);
        }

        // Sucursales
        const allSelected =
          sucursalesOpts.length > 0 &&
          selectedSucursalIds.length === sucursalesOpts.length;
        if (!allSelected) {
          if (selectedSucursalIds.length > 0) {
            for (const id of selectedSucursalIds)
              params.append("sucursal_ids", String(id));
          } else if (userRole === "cajero" && userSucursalId) {
            params.append("sucursal_ids", String(userSucursalId));
          }
        }

        const token = getToken();
        const res = await fetch(`/api/caja?${params.toString()}`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          console.error("Error obteniendo registros:", res.status, txt);
          throw new Error("Error al cargar registros (ver consola).");
        }

        const body = (await res.json().catch(() => ({}))) as unknown;

        // extraer lista de registros de manera tolerante
        let rawList: unknown[] = [];
        if (
          isObject(body) &&
          Array.isArray((body as Record<string, unknown>).registros)
        )
          rawList = (body as Record<string, unknown>).registros as unknown[];
        else if (Array.isArray(body)) rawList = body;
        else if (
          isObject(body) &&
          Array.isArray((body as Record<string, unknown>).rows)
        )
          rawList = (body as Record<string, unknown>).rows as unknown[];

        const mapped: RegistroUI[] = rawList.map((r) => {
          const fechaIso = extractDateIso(r, [
            "fecha_registro",
            "fecha",
            "fechaRegistro",
            "createdAt",
            "created_at",
            "fecha_creacion",
          ]);
          const venta = extractNumber(r, [
            "venta_total_registrada",
            "ventaTotal",
            "venta",
            "ventaTotalRegistrada",
          ]);
          const efectivo = extractNumber(r, [
            "efectivo_en_caja",
            "efectivo",
            "cash",
            "efectivoEnCaja",
          ]);
          const restauranteName =
            extractString(r, [
              "restaurante",
              "sucursal_nombre",
              "sucursal",
              "restaurant",
              "nombre",
            ]) ?? "";

          const idNum =
            extractNumber(r, ["id", "identificacion", "_id", "ID"]) ??
            Number(
              extractString(r, ["id", "identificacion", "_id", "ID"]) ?? 0
            );

          return {
            id: Number.isNaN(idNum) ? 0 : Math.trunc(idNum),
            restaurante: restauranteName,
            fechaRegistro: fechaIso,
            turno: extractString(r, ["turno", "turn"]) ?? "-",
            ventaTotalRegistrada: venta,
            efectivoEnCaja: efectivo,
            estado:
              extractString(r, ["estado", "estado_caja", "status"]) ?? "-",
          };
        });

        setRegistros(mapped);

        // total
        let totalFromBody: number | null = null;
        if (isObject(body)) {
          const maybeTotal = extractNumber(body, [
            "total",
            "count",
            "totalCount",
          ]);
          if (typeof maybeTotal === "number") totalFromBody = maybeTotal;
        }
        setTotal(totalFromBody ?? mapped.length);
      } catch (err) {
        console.error("Error obteniendo registros:", err);
        alert("Error al cargar registros (ver consola).");
      } finally {
        setLoading(false);
      }
    },
    [
      fromDate,
      toDate,
      selectedTurnos,
      limit,
      selectedSucursalIds,
      sucursalesOpts,
      userRole,
      userSucursalId,
      page,
    ]
  );

  const handleDescargar = () => {
    if (!fromDate || !toDate) {
      alert("Selecciona desde y hasta para descargar.");
      return;
    }

    if (fromDate > toDate) {
      alert("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.");
      return;
    }

    const months = monthsBetween(fromDate, toDate);
    if (months === Infinity) {
      alert("Fechas inválidas. Verifica el formato.");
      return;
    }
    if (months > 3) {
      alert("El rango seleccionado no puede ser mayor a 3 meses.");
      return;
    }

    const params = new URLSearchParams();
    params.set("from", fromDate);
    params.set("to", toDate);

    if (selectedTurnos.length > 0) {
      for (const t of selectedTurnos) params.append("turno", t);
    }

    const allSelected =
      sucursalesOpts.length > 0 &&
      selectedSucursalIds.length === sucursalesOpts.length;
    if (!allSelected) {
      if (selectedSucursalIds.length > 0) {
        for (const id of selectedSucursalIds)
          params.append("sucursal_ids", String(id));
      } else if (userRole === "cajero" && userSucursalId) {
        params.append("sucursal_ids", String(userSucursalId));
      }
    }

    const token = getToken();
    const url = `/api/caja/resumen/excel?${params.toString()}`; // backend actualizado para devolver exactamente los registros filtrados
    fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Error descargando Excel");
        return r.blob();
      })
      .then((blob) => {
        const a = document.createElement("a");
        const urlObj = window.URL.createObjectURL(blob);
        a.href = urlObj;
        const filename = `registros-${fromDate}-to-${toDate}.xlsx`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(urlObj);
      })
      .catch((error) => {
        console.error("Error descargando Excel:", error);
        alert("Error descargando informe.");
      });
  };

  // helpers UI para mostrar texto del select
  const labelTurnos =
    selectedTurnos.length === 0 ? "Todos" : selectedTurnos.join(", ");
  const labelSucursales =
    sucursalesOpts.length > 0 &&
    selectedSucursalIds.length === sucursalesOpts.length
      ? "Todas"
      : selectedSucursalIds.length === 0
      ? "Seleccionar sucursal(es)"
      : `${selectedSucursalIds.length} seleccionada(s)`;

  // acciones del dropdown: seleccionar todo / borrar selección
  const seleccionarTodoSucursales = () => {
    const ids = sucursalesOpts.map((s) => s.id);
    setSelectedSucursalIds(ids);
    console.debug("Seleccionar todo sucursales -> ids:", ids);
  };
  const borrarSeleccionSucursales = () => {
    setSelectedSucursalIds([]);
    console.debug("Borrar selección sucursales");
  };

  // Eliminar registro (solo admin)
  const handleEliminar = async (id: number) => {
    if (!confirm("¿Eliminar este registro? Esta acción no puede deshacerse."))
      return;
    try {
      const token = getToken();
      const res = await fetch(`/api/caja/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as unknown;
        let mensaje = `Error eliminando registro (status ${res.status})`;
        if (
          body &&
          typeof body === "object" &&
          "mensaje" in (body as Record<string, unknown>)
        ) {
          const m = (body as Record<string, unknown>).mensaje;
          if (typeof m === "string" && m.trim() !== "") mensaje = m;
        } else {
          const txt = await res.text().catch(() => "");
          if (txt) mensaje = txt;
        }
        console.error("Error eliminando registro:", res.status, mensaje);
        alert(mensaje);
        return;
      }

      alert("Registro eliminado correctamente.");
      const newPage = 1;
      setPage(newPage);
      await fetchRegistros(newPage);
    } catch (error) {
      console.error("Error eliminando registro:", error);
      alert("Error eliminando registro (ver consola).");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <CajeroMenu />

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Registros de Caja</h1>

        {userRole === "administrador" && (
          <button
            onClick={() => navigate("/admin")}
            style={{ marginLeft: "auto" }}
          >
            Ir al panel (Admin)
          </button>
        )}
      </div>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <label>
          Desde:
          <input
            type="date"
            value={fromDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChangeFromDate(e.target.value)
            }
            style={{ marginLeft: 6 }}
          />
        </label>

        <label>
          Hasta:
          <input
            type="date"
            value={toDate}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              onChangeToDate(e.target.value)
            }
            style={{ marginLeft: 6 }}
          />
        </label>

        {/* Turnos: desplegable multi-select con "Seleccionar todo" y "Borrar selección" */}
        <div ref={turnoDropdownRef} style={{ position: "relative" }}>
          <div style={{ fontWeight: 600 }}>Turno</div>
          <button
            type="button"
            onClick={() => setOpenTurnos((s) => !s)}
            style={{
              marginTop: 6,
              padding: "6px 10px",
              minWidth: 120,
              textAlign: "left",
            }}
            title="Seleccionar turnos (uno o varios)"
          >
            {labelTurnos}
            <span style={{ float: "right" }}>{openTurnos ? "▲" : "▼"}</span>
          </button>

          {openTurnos && (
            <div
              style={{
                position: "absolute",
                zIndex: 999,
                top: "100%",
                left: 0,
                width: 220,
                border: "1px solid #ccc",
                background: "#fff",
                padding: 8,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedTurnos(["A", "B", "C", "D"])}
                  style={{ fontSize: 13 }}
                >
                  Seleccionar todo
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTurnos([])}
                  style={{ fontSize: 13 }}
                >
                  Borrar selección
                </button>
              </div>

              {["A", "B", "C", "D"].map((t) => (
                <label key={t} style={{ display: "block", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={selectedTurnos.includes(t)}
                    onChange={() => toggleTurno(t)}
                  />
                  &nbsp;{t}
                </label>
              ))}

              <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                Nota: si no seleccionas ningún turno se muestran todos.
              </div>
            </div>
          )}
        </div>

        {/* Sucursales: desplegable multiselección (sin controles externos) */}
        <div style={{ minWidth: 280 }} ref={sucDropdownRef}>
          <div style={{ fontWeight: 600 }}>Sucursales (filtrar)</div>

          <div style={{ marginTop: 6 }}>
            <button
              type="button"
              onClick={() => setOpenSucursales((s) => !s)}
              style={{ padding: "6px 10px", minWidth: 200, textAlign: "left" }}
              title="Abrir lista de sucursales"
            >
              {labelSucursales}
              <span style={{ float: "right" }}>
                {openSucursales ? "▲" : "▼"}
              </span>
            </button>

            {openSucursales && (
              <div
                style={{
                  marginTop: 6,
                  maxHeight: 260,
                  overflow: "auto",
                  border: "1px solid #ddd",
                  padding: 8,
                  background: "#fff",
                  boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
                  position: "absolute",
                  zIndex: 999,
                  width: 300,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={seleccionarTodoSucursales}
                    style={{ fontSize: 13 }}
                  >
                    Seleccionar todo
                  </button>
                  <button
                    type="button"
                    onClick={borrarSeleccionSucursales}
                    style={{ fontSize: 13 }}
                  >
                    Borrar selección
                  </button>
                </div>

                {sucursalesOpts.map((s) => (
                  <label key={s.id} style={{ display: "block", fontSize: 14 }}>
                    <input
                      type="checkbox"
                      checked={selectedSucursalIds.includes(s.id)}
                      onChange={() => toggleSucursal(s.id)}
                    />
                    &nbsp;{s.nombre}
                  </label>
                ))}
                {sucursalesOpts.length === 0 && (
                  <div style={{ fontSize: 13 }}>Cargando sucursales...</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginLeft: "auto",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setPage(1);
              fetchRegistros(1);
            }}
          >
            Buscar
          </button>

          <button type="button" onClick={handleDescargar}>
            Descargar informe (Excel)
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando...</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>
                  Sucursal
                </th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Fecha</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Turno</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>
                  Venta Total
                </th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>
                  Efectivo
                </th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>Estado</th>
                <th style={{ border: "1px solid #ddd", padding: 6 }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr
                  key={`${r.restaurante}-${r.fechaRegistro ?? ""}-${
                    r.turno ?? ""
                  }-${r.ventaTotalRegistrada ?? 0}`}
                >
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    {r.restaurante}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    {formatDisplayDate(r.fechaRegistro)}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    {r.turno ?? "-"}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    {formatNumber(r.ventaTotalRegistrada ?? null)}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    {formatNumber(r.efectivoEnCaja ?? null)}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    {formatEstadoText(r.estado)}
                  </td>
                  <td style={{ border: "1px solid #eee", padding: 6 }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/caja/view/${r.id}`)}
                      style={{ marginRight: 6 }}
                      title="Ver"
                    >
                      👁️
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        userRole === "administrador"
                          ? navigate(`/admin/registros/edit/${r.id}`)
                          : undefined
                      }
                      disabled={userRole !== "administrador"}
                      title={
                        userRole !== "administrador"
                          ? "Solo administradores pueden editar"
                          : "Editar"
                      }
                      style={{
                        marginRight: 6,
                        opacity: userRole === "administrador" ? 1 : 0.45,
                        cursor:
                          userRole === "administrador"
                            ? "pointer"
                            : "not-allowed",
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(r.id)}
                      disabled={userRole !== "administrador"}
                      title={
                        userRole !== "administrador"
                          ? "Solo administradores pueden eliminar"
                          : "Eliminar"
                      }
                      style={{
                        marginRight: 6,
                        opacity: userRole === "administrador" ? 1 : 0.45,
                        cursor:
                          userRole === "administrador"
                            ? "pointer"
                            : "not-allowed",
                        border: "none",
                        background: "transparent",
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 12, textAlign: "center" }}>
                    Sin registros
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              Total:{" "}
              {typeof total === "number"
                ? total.toLocaleString("es-CO")
                : total}
            </div>
            <div>
              <button
                type="button"
                onClick={() => {
                  const newPage = Math.max(1, page - 1);
                  setPage(newPage);
                  fetchRegistros(newPage);
                }}
                disabled={page === 1}
              >
                Prev
              </button>
              <span style={{ margin: "0 8px" }}>Página {page}</span>
              <button
                type="button"
                onClick={() => {
                  const newPage = page + 1;
                  setPage(newPage);
                  fetchRegistros(newPage);
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  function formatNumber(n?: number | null) {
    return typeof n === "number" && !Number.isNaN(n)
      ? n.toLocaleString("es-CO", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      : "-";
  }

  function formatDisplayDate(isoOrStr?: string | null) {
    if (!isoOrStr) return "-";
    const d = new Date(isoOrStr);
    if (isNaN(d.getTime())) return String(isoOrStr).slice(0, 19);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }
}
