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
  detalle?: string | null;
  created_at?: string | null;
};

type Usuario = {
  id: number;
  nombre: string;
};

/* =======================
   HELPERS
======================= */

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[objeto]";
  }
}

function formatDate(date?: string | null): string {
  if (!date) return "-";
  const d = new Date(date);
  return isNaN(d.getTime()) ? date : d.toLocaleString("es-CO");
}

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

  const totalPages = Math.max(1, Math.ceil(total / limit));

  /* =======================
     CARGAR USUARIOS
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

  /* =======================
     CARGAR ACCIONES
  ======================= */

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

  /* =======================
     CARGAR AUDITORÍAS
  ======================= */

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
      setErrorMsg(
        err instanceof Error ? err.message : "Error cargando auditorías"
      );
      setAuditorias([]);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     INIT
  ======================= */

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
          style={inputStyle}
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
          style={inputStyle}
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
          style={inputStyle}
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
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>ID</th>
                    <th style={thStyle}>Usuario</th>
                    <th style={thStyle}>Acción</th>
                    <th style={thStyle}>Recurso</th>
                    <th style={thStyle}>Detalle</th>
                    <th style={thStyle}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {auditorias.map((a) => (
                    <tr key={a.id}>
                      <td style={tdStyle}>{a.id}</td>
                      <td style={tdStyle}>
                        {a.usuario_nombre ?? a.usuario_id ?? "-"}
                      </td>
                      <td style={tdStyle}>{renderValue(a.accion)}</td>
                      <td style={tdStyle}>{renderValue(a.recurso)}</td>
                      <td style={tdStyle}>{renderValue(a.detalle)}</td>
                      <td style={tdStyle}>{formatDate(a.created_at)}</td>
                    </tr>
                  ))}
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
    </div>
  );
}

/* =======================
   ESTILOS
======================= */

const inputStyle: React.CSSProperties = {
  padding: 6,
  fontSize: 13,
  minWidth: 160,
};

const thStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  padding: 6,
  background: "#f4f4f4",
  fontSize: 13,
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #eee",
  padding: 6,
  fontSize: 13,
};
