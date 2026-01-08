// frontend/src/pages/AuditoriasPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../utils/authService";

/* =======================
   TIPOS
   ======================= */

type AuditoriasResponse = {
  auditorias: Auditoria[];
  total: number;
  page: number;
  limit: number;
};

type Auditoria = {
  id: number;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  accion?: string | null;
  recurso?: string | null;
  recurso_id?: number | null;
  detalle?: unknown | null; // <-- usar unknown en vez de any
  created_at?: string | null;
};

type Usuario = {
  id: number;
  nombre: string;
};

type AuditChange = {
  field: string;
  before: unknown;
  after: unknown;
};

type AuditDetalle = {
  type?: string;
  resource?: string;
  changes?: AuditChange[];
};

/* =======================
   HELPERS / CONFIG
   ======================= */

const currencyFields = new Set([
  "venta_total_registrada",
  "efectivo_en_caja",
  "tarjetas",
  "convenios",
  "bonos_sodexo",
  "pagos_internos",
  "valor_consignar",
  "dinero_registrado",
  "diferencia",
]);

function formatMoney(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(date?: string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toLocaleString("es-CO");
}

/** etiquetas legibles para campos */
const fieldLabels: Record<string, string> = {
  fecha_registro: "Fecha registro",
  venta_total_registrada: "Venta total registrada",
  efectivo_en_caja: "Efectivo en caja",
  tarjetas: "Tarjetas",
  tarjetas_cantidad: "Tarjetas (cant.)",
  convenios: "Convenios",
  convenios_cantidad: "Convenios (cant.)",
  bonos_sodexo: "Bonos Sodexo",
  bonos_sodexo_cantidad: "Bonos Sodexo (cant.)",
  pagos_internos: "Pagos internos",
  pagos_internos_cantidad: "Pagos internos (cant.)",
  valor_consignar: "Valor a consignar",
  dinero_registrado: "Dinero registrado",
  diferencia: "Diferencia",
  estado: "Estado",
  observacion: "Observación",
  cajero_nombre: "Cajero",
  cajero_cedula: "Cédula cajero",
  sucursal_id: "Sucursal (id)",
  restaurante: "Restaurante",
  turno: "Turno",
};

/** decide si dos valores son diferentes (más tolerante que JSON.stringify simple) */
function areDifferent(a: unknown, b: unknown): boolean {
  // normalización ligera
  const norm = (v: unknown) => {
    if (v === undefined) return null;
    if (v === null) return null;
    if (typeof v === "string" && v.trim() !== "") {
      const maybeNum = Number(String(v).replace(/\s+/g, "").replace(",", "."));
      if (!Number.isNaN(maybeNum) && String(maybeNum) === v.replace(",", "."))
        return maybeNum;
    }
    if (typeof v === "string") {
      const d = new Date(v);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return v;
  };

  const A = norm(a);
  const B = norm(b);

  if (A === null && B === null) return false;
  if (typeof A === "number" && typeof B === "number") return A !== B;

  try {
    return JSON.stringify(A) !== JSON.stringify(B);
  } catch {
    return String(A) !== String(B);
  }
}

/** renderiza valor con formatos especiales */
function renderValue(value: unknown, field?: string): string {
  if (value === null || value === undefined) return "-";
  if (field === "fecha_registro") {
    try {
      const d = new Date(String(value));
      if (!isNaN(d.getTime())) return d.toLocaleString("es-CO");
    } catch {
      // fallback
    }
  }
  if (field && currencyFields.has(field)) {
    return formatMoney(value);
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/* =======================
   STYLES (inline)
   ======================= */

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const thStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: 6,
  background: "#f4f4f4",
  fontSize: 13,
  textAlign: "left",
  verticalAlign: "top",
  width: "15%",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #eee",
  padding: 6,
  fontSize: 13,
  verticalAlign: "top",
  overflowWrap: "break-word",
  wordBreak: "break-word",
  whiteSpace: "normal",
};

const miniContainer: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const miniCol: React.CSSProperties = {
  flex: "1 1 170px",
  minWidth: 140,
};

const miniHeader: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  marginBottom: 6,
};

const miniItem: React.CSSProperties = {
  padding: "4px 0",
  fontSize: 13,
};

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};

const modalBox: React.CSSProperties = {
  width: "90%",
  maxWidth: 900,
  maxHeight: "85vh",
  overflow: "auto",
  background: "#fff",
  padding: 16,
  borderRadius: 6,
  boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
};

/* =======================
   COMPONENTE
   ======================= */

export default function AuditoriasPage(): React.ReactElement {
  const navigate = useNavigate();

  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [acciones, setAcciones] = useState<string[]>([]);

  // filtros
  const [usuarioId, setUsuarioId] = useState("");
  const [accion, setAccion] = useState("");
  const [recurso, setRecurso] = useState("");

  // paginación
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit)); // <-- ahora usado

  // modal detalle
  const [selected, setSelected] = useState<Auditoria | null>(null);

  /* =======================
     API: CARGAR USUARIOS / ACCIONES / AUDITORÍAS
     ======================= */

  const loadUsuarios = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/usuarios", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { usuarios?: Usuario[] };
      setUsuarios(body.usuarios ?? []);
    } catch (err) {
      console.warn("No se pudieron cargar usuarios", err);
    }
  };

  const loadAcciones = async () => {
    try {
      const token = getToken();
      const res = await fetch("/api/auditorias/acciones", {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const body = (await res.json()) as { acciones?: string[] };
      setAcciones(body.acciones ?? []);
    } catch (err) {
      console.warn("No se pudieron cargar acciones", err);
    }
  };

  const loadAuditorias = async (pageToLoad = page) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (usuarioId) params.append("usuario_id", usuarioId);
      if (accion) params.append("accion", accion);
      if (recurso) params.append("recurso", recurso);
      params.append("page", String(pageToLoad));
      params.append("limit", String(limit));

      const res = await fetch(`/api/auditorias?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Error cargando auditorías");
      }

      const body = (await res.json()) as AuditoriasResponse;
      setAuditorias(body.auditorias ?? []);
      setTotal(body.total ?? 0);
      setPage(body.page ?? 1);
    } catch (err) {
      console.warn("Error al cargar auditorías:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Error cargando auditorías"
      );
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsuarios();
    loadAcciones();
    loadAuditorias(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =======================
     RENDER
     ======================= */

  return (
    <div style={{ padding: 12 }}>
      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Auditorías</h2>
        <button
          style={{ marginLeft: "auto" }}
          onClick={() => navigate("/admin")}
        >
          ← Volver
        </button>
      </div>

      {/* FILTROS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <select
          value={usuarioId}
          onChange={(e) => setUsuarioId(e.target.value)}
          style={{ padding: 6, fontSize: 13, minWidth: 160 }}
        >
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => (
            <option key={u.id} value={u.id}>
              {u.nombre}
            </option>
          ))}
        </select>

        <select
          value={accion}
          onChange={(e) => setAccion(e.target.value)}
          style={{ padding: 6, fontSize: 13, minWidth: 160 }}
        >
          <option value="">Todas las acciones</option>
          {acciones.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Recurso"
          value={recurso}
          onChange={(e) => setRecurso(e.target.value)}
          style={{ padding: 6, fontSize: 13, minWidth: 160 }}
        />

        <button
          onClick={() => {
            setPage(1);
            loadAuditorias(1);
          }}
        >
          Aplicar
        </button>

        <button
          onClick={() => {
            setUsuarioId("");
            setAccion("");
            setRecurso("");
            setPage(1);
            loadAuditorias(1);
          }}
        >
          Limpiar
        </button>
      </div>

      {/* TABLA */}
      <div style={{ marginTop: 12 }}>
        {loading ? (
          <div>Cargando...</div>
        ) : errorMsg ? (
          <div style={{ color: "crimson" }}>{errorMsg}</div>
        ) : auditorias.length === 0 ? (
          <div>No hay auditorías</div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 60 }}>-id </th>
                    <th style={thStyle}>Usuario</th>
                    <th style={thStyle}>Acción</th>
                    <th style={thStyle}>Recurso</th>
                    <th style={{ ...thStyle, width: "40%" }}>
                      Antes / Después
                    </th>
                    <th style={thStyle}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {auditorias.map((a) => {
                    // parse detalle (seguro)
                    let parsed: AuditDetalle | null = null;
                    if (a.detalle) {
                      if (typeof a.detalle === "string") {
                        try {
                          parsed = JSON.parse(a.detalle) as AuditDetalle;
                        } catch {
                          parsed = null;
                        }
                      } else if (typeof a.detalle === "object") {
                        parsed = a.detalle as AuditDetalle;
                      }
                    }

                    const rawChanges = Array.isArray(parsed?.changes)
                      ? parsed!.changes!
                      : [];
                    const changes = rawChanges.filter((c) =>
                      areDifferent(c.before, c.after)
                    );

                    return (
                      <tr key={a.id}>
                        <td style={{ ...tdStyle, width: 60 }}>{a.id}</td>
                        <td style={tdStyle}>
                          {a.usuario_nombre ?? a.usuario_id ?? "-"}
                        </td>
                        <td style={tdStyle}>{a.accion ?? "-"}</td>
                        <td style={tdStyle}>{a.recurso ?? "-"}</td>

                        <td style={tdStyle}>
                          {changes.length > 0 ? (
                            <div style={miniContainer}>
                              <div style={miniCol}>
                                <div style={miniHeader}>Campo</div>
                                {changes.map((c, i) => (
                                  <div key={i} style={miniItem}>
                                    {fieldLabels[c.field] ??
                                      c.field.replace(/_/g, " ")}
                                  </div>
                                ))}
                              </div>

                              <div style={miniCol}>
                                <div style={miniHeader}>Antes</div>
                                {changes.map((c, i) => (
                                  <div key={i} style={miniItem}>
                                    {renderValue(c.before, c.field)}
                                  </div>
                                ))}
                              </div>

                              <div style={miniCol}>
                                <div style={miniHeader}>Después</div>
                                {changes.map((c, i) => (
                                  <div key={i} style={miniItem}>
                                    {renderValue(c.after, c.field)}
                                  </div>
                                ))}
                              </div>

                              <div
                                style={{
                                  minWidth: 90,
                                  alignSelf: "flex-start",
                                }}
                              >
                                <button onClick={() => setSelected(a)}>
                                  Ver
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {parsed ? (
                                <pre
                                  style={{
                                    margin: 0,
                                    whiteSpace: "pre-wrap",
                                    fontSize: 12,
                                  }}
                                >
                                  {JSON.stringify(parsed, null, 2)}
                                </pre>
                              ) : (
                                <span>{String(a.detalle ?? "-")}</span>
                              )}
                            </>
                          )}
                        </td>

                        <td style={tdStyle}>{formatDate(a.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* PAGINACIÓN */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => loadAuditorias(page - 1)}
              >
                ◀ Anterior
              </button>

              <span>
                Página {page} de {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => loadAuditorias(page + 1)}
              >
                Siguiente ▶
              </button>
            </div>
          </>
        )}
      </div>

      {/* MODAL DETALLE */}
      {selected && (
        <div style={modalOverlay} onClick={() => setSelected(null)}>
          <div style={modalBox} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>Detalle auditoría #{selected.id}</h3>
              <button onClick={() => setSelected(null)}>Cerrar</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Acción:</strong> {selected.accion} <br />
              <strong>Recurso:</strong> {selected.recurso} <br />
              <strong>Usuario:</strong>{" "}
              {selected.usuario_nombre ?? selected.usuario_id} <br />
              <strong>Fecha:</strong> {formatDate(selected.created_at)} <br />
            </div>

            <hr />

            <div style={{ maxHeight: "60vh", overflow: "auto" }}>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                {typeof selected.detalle === "string"
                  ? (() => {
                      try {
                        return JSON.stringify(
                          JSON.parse(selected.detalle),
                          null,
                          2
                        );
                      } catch {
                        return selected.detalle;
                      }
                    })()
                  : JSON.stringify(selected.detalle ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
