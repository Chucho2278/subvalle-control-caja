// src/pages/ConveniosPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/index";
import type { AxiosError } from "axios";

type Convenio = {
  id: number;
  nombre: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeConvenio(item: unknown): Convenio | null {
  if (!isObject(item)) return null;
  const rawId = item["id"] ?? item["_id"] ?? item["convenio_id"];
  const id = Number(rawId ?? 0) || 0;
  const nombreRaw = item["nombre"] ?? item["nombre_convenio"];
  const nombre =
    typeof nombreRaw === "string"
      ? nombreRaw.trim()
      : String(nombreRaw ?? "").trim();
  if (!nombre) return null;
  return { id: Math.trunc(id), nombre };
}

export default function ConveniosPage() {
  const [convenios, setConvenios] = useState<Convenio[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState<{ nombre: string }>({ nombre: "" });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const nav = useNavigate();
  const { pathname } = useLocation();
  const params = useParams<{ id?: string }>();

  // Consideramos edición cuando params.id existe y no es vacío
  const isEditing = typeof params.id === "string" && params.id.trim() !== "";

  // Cargar lista de convenios
  const load = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get("/convenios");
      const data = (res.data && (res.data.convenios ?? res.data)) ?? [];
      const arr = Array.isArray(data) ? data : [];
      setConvenios(
        arr.map(normalizeConvenio).filter((c): c is Convenio => c !== null)
      );
    } catch (err) {
      const e = err as AxiosError;
      if (e.response?.status === 401) {
        alert("Sesión expirada. Inicia sesión nuevamente.");
        nav("/login");
        return;
      }
      console.error("Error cargando convenios:", err);
      setErrorMsg("Error cargando convenios. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si estamos en ruta edit/:id, asegurar que el form se complete:
  useEffect(() => {
    if (!isEditing) {
      // si entramos en create o lista -> limpiar
      if (pathname.endsWith("/create")) setForm({ nombre: "" });
      return;
    }

    const id = Number(params.id);
    if (!id || isNaN(id)) {
      setErrorMsg("Id de convenio inválido");
      setForm({ nombre: "" });
      return;
    }

    // 1) intentar cargar desde lista local
    const found = convenios.find((c) => c.id === id);
    if (found) {
      setForm({ nombre: found.nombre });
      return;
    }

    // 2) si no hay local, pedir al backend
    (async () => {
      setLoading(true);
      try {
        const r = await api.get(`/convenios/${id}`);
        const c = (r.data && (r.data.convenio ?? r.data)) ?? null;
        const normalized = normalizeConvenio(c);
        if (normalized) {
          setForm({ nombre: normalized.nombre });
        } else {
          setErrorMsg("Convenio no encontrado");
          setForm({ nombre: "" });
        }
      } catch (err) {
        const e = err as AxiosError;
        if (e.response?.status === 401) {
          alert("Sesión expirada. Inicia sesión.");
          nav("/login");
        } else if (e.response?.status === 404) {
          setErrorMsg("Convenio no encontrado");
        } else {
          console.warn("Error cargando convenio por id:", err);
          setErrorMsg("Error al cargar convenio (ver consola)");
        }
        setForm({ nombre: "" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, params.id, convenios, pathname]);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("¿Eliminar este convenio?")) return;
    try {
      await api.delete(`/convenios/${id}`);
      setSuccessMsg("Convenio eliminado correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
    } catch (err) {
      console.error("Error eliminando convenio:", err);
      alert("Error eliminando convenio (ver consola)");
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.nombre || !form.nombre.trim()) {
      alert("Nombre requerido");
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        const idToUse = Number(params.id);
        if (!idToUse || isNaN(idToUse)) {
          alert("Id inválido para actualización");
          setSaving(false);
          return;
        }
        await api.put(`/convenios/${idToUse}`, { nombre: form.nombre.trim() });
        setSuccessMsg("Convenio actualizado correctamente");
      } else {
        await api.post("/convenios", { nombre: form.nombre.trim() });
        setSuccessMsg("Convenio creado correctamente");
      }
      setTimeout(() => setSuccessMsg(null), 3000);
      await load();
      nav("/admin/convenios");
    } catch (err) {
      const e = err as AxiosError;
      const data = e.response?.data as { mensaje?: string } | undefined;
      alert(data?.mensaje || "Error guardando convenio (ver consola)");
      console.error("Error guardando convenio:", err);
    } finally {
      setSaving(false);
    }
  };

  const showingForm =
    pathname.endsWith("/create") || pathname.includes("/edit/");

  return (
    <div style={{ padding: 16 }}>
      <h2>Convenios</h2>

      {successMsg && (
        <div
          style={{
            background: "#e6ffea",
            border: "1px solid #bfe8c8",
            padding: 8,
            marginBottom: 12,
          }}
        >
          {successMsg}
        </div>
      )}

      {!showingForm && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => nav("/admin")}>Volver</button>{" "}
            <button onClick={() => nav("/admin/convenios/create")}>
              Crear convenio
            </button>
          </div>

          {loading ? (
            <div>Cargando convenios...</div>
          ) : errorMsg ? (
            <div style={{ color: "red" }}>{errorMsg}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Convenio</th>
                </tr>
              </thead>
              <tbody>
                {convenios.map((c) => (
                  <tr key={c.id}>
                    <td style={{ padding: 8 }}>
                      {c.nombre}
                      <button
                        onClick={() => nav(`/admin/convenios/edit/${c.id}`)}
                        style={{
                          marginLeft: 12,
                          backgroundColor: "#f0f7ff",
                          border: "1px solid #d0e6ff",
                          cursor: "pointer",
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        style={{
                          marginLeft: 8,
                          backgroundColor: "#fff0f0",
                          border: "1px solid #ffd0d0",
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {convenios.length === 0 && (
                  <tr>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      No hay convenios registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {showingForm && (
        <div style={{ marginTop: 12, maxWidth: 640 }}>
          <h3>{isEditing ? "Editar convenio" : "Crear convenio"}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 8 }}>
              <label>
                Nombre del convenio
                <input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
              </button>
              <button type="button" onClick={() => nav("/admin/convenios")}>
                Volver
              </button>
              <button type="button" onClick={() => nav("/admin")}>
                Ir al inicio
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
