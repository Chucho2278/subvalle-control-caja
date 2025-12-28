// frontend/src/pages/SucursalesPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/index";
import type { AxiosError } from "axios";

type Sucursal = {
  id: number;
  nombre: string;
  numero_tienda?: string | null;
  direccion?: string | null;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function normalizeSucursal(item: unknown): Sucursal | null {
  if (!isObject(item)) return null;
  const idNum =
    Number(item["id"] ?? item["sucursal_id"] ?? item["_id"] ?? 0) || 0;
  const nombre =
    (typeof item["nombre"] === "string" && item["nombre"].trim()) ||
    (typeof item["sucursal_nombre"] === "string" &&
      item["sucursal_nombre"].trim()) ||
    (typeof item["restaurante"] === "string" && item["restaurante"].trim()) ||
    "";
  const numero_tienda =
    typeof item["numero_tienda"] === "string" ||
    typeof item["numero_tienda"] === "number"
      ? String(item["numero_tienda"])
      : null;
  const direccion =
    typeof item["direccion"] === "string" ? item["direccion"] : null;
  if (!nombre) return null;
  return { id: Math.trunc(idNum), nombre, numero_tienda, direccion };
}

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const nav = useNavigate();
  const { pathname } = useLocation();
  const params = useParams<{ id?: string }>();

  const [form, setForm] = useState<{
    nombre: string;
    numero_tienda?: string;
    direccion?: string;
  }>({
    nombre: "",
    numero_tienda: "",
    direccion: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  // Cargar lista
  const load = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.get("/sucursales"); // <- ruta plural
      const data = res.data?.sucursales ?? res.data ?? [];
      const arr = Array.isArray(data) ? data : [];
      const mapped = arr
        .map(normalizeSucursal)
        .filter((s): s is Sucursal => s !== null);
      setSucursales(mapped);
    } catch (err) {
      const e = err as AxiosError;
      if (e.response?.status === 401) {
        alert("Sesión expirada. Por favor inicia sesión de nuevo.");
        nav("/login");
        return;
      }
      console.error("Error cargando sucursales:", err);
      setErrorMsg("Error al cargar sucursales. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detectar rutas create / edit y precargar formulario correctamente.
  useEffect(() => {
    // CREATE
    if (pathname.endsWith("/create")) {
      setForm({ nombre: "", numero_tienda: "", direccion: "" });
      setEditingId(null);
      return;
    }

    // EDIT
    if (pathname.includes("/edit/") && params.id) {
      const id = Number(params.id);
      if (!id || isNaN(id)) {
        setErrorMsg("Id inválido en la URL");
        setEditingId(null);
        setForm({ nombre: "", numero_tienda: "", direccion: "" });
        return;
      }

      // 1) intentar cargar desde lista local (rápido)
      const found = sucursales.find((s) => s.id === id);
      if (found) {
        setForm({
          nombre: found.nombre,
          numero_tienda: found.numero_tienda ?? "",
          direccion: found.direccion ?? "",
        });
        setEditingId(id);
        return;
      }

      // 2) si no está localmente, pedir al backend por id (ruta plural).
      (async () => {
        try {
          setLoading(true);
          // Intentamos ruta plural primero
          let r = await api.get(`/sucursales/${id}`);
          let s = r.data?.sucursal ?? r.data ?? null;
          let normalized = normalizeSucursal(s);
          if (!normalized) {
            // si no vino como esperábamos, intentar la variante singular para compatibilidad
            try {
              r = await api.get(`/sucursal/${id}`);
              s = r.data?.sucursal ?? r.data ?? null;
              normalized = normalizeSucursal(s);
            } catch {
              // fallback ignore
            }
          }
          if (normalized) {
            setForm({
              nombre: normalized.nombre,
              numero_tienda: normalized.numero_tienda ?? "",
              direccion: normalized.direccion ?? "",
            });
            setEditingId(id);
          } else {
            setErrorMsg("No se encontró la sucursal a editar");
            setEditingId(null);
            setForm({ nombre: "", numero_tienda: "", direccion: "" });
          }
        } catch (err) {
          const e = err as AxiosError;
          if (e.response?.status === 401) {
            alert("Sesión expirada. Inicia sesión nuevamente.");
            nav("/login");
          } else if (e.response?.status === 404) {
            setErrorMsg("Sucursal no encontrada (404)");
          } else {
            console.warn("Error cargando sucursal remota", err);
            setErrorMsg("Error al cargar sucursal (ver consola)");
          }
          setEditingId(null);
          setForm({ nombre: "", numero_tienda: "", direccion: "" });
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setEditingId(null);
    }
  }, [pathname, params.id, sucursales, nav]);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("¿Eliminar sucursal?")) return;
    try {
      // preferimos plural
      await api.delete(`/sucursales/${id}`).catch(async (err) => {
        const e = err as AxiosError;
        if (e.response?.status === 404) {
          // fallback a singular
          await api.delete(`/sucursal/${id}`);
        } else {
          throw err;
        }
      });
      setSuccessMsg("Sucursal eliminada");
      setTimeout(() => setSuccessMsg(null), 2500);
      await load();
    } catch (err) {
      console.error("Error eliminando sucursal", err);
      alert("Error eliminando sucursal");
    }
  };

  // Guardar (crear o actualizar)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.nombre || form.nombre.trim() === "") {
      alert("Nombre requerido");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        // intenta PUT en plural, si 404 intenta singular (fallback)
        try {
          await api.put(`/sucursales/${editingId}`, {
            nombre: form.nombre.trim(),
            numero_tienda: form.numero_tienda || null,
            direccion: form.direccion || null,
          });
        } catch (err) {
          const e = err as AxiosError;
          if (e.response?.status === 404) {
            // fallback antiguo
            await api.put(`/sucursal/${editingId}`, {
              nombre: form.nombre.trim(),
              numero_tienda: form.numero_tienda || null,
              direccion: form.direccion || null,
            });
          } else {
            throw err;
          }
        }
        setSuccessMsg("Sucursal actualizada");
      } else {
        // crear (POST) -> preferimos plural y fallback a singular si 404
        try {
          await api.post("/sucursales", {
            nombre: form.nombre.trim(),
            numero_tienda: form.numero_tienda || null,
            direccion: form.direccion || null,
          });
        } catch (err) {
          const e = err as AxiosError;
          if (e.response?.status === 404) {
            await api.post("/sucursal", {
              nombre: form.nombre.trim(),
              numero_tienda: form.numero_tienda || null,
              direccion: form.direccion || null,
            });
          } else {
            throw err;
          }
        }
        setSuccessMsg("Sucursal creada");
      }

      setTimeout(() => setSuccessMsg(null), 2500);
      await load();
      nav("/admin/sucursales");
    } catch (err) {
      const e = err as AxiosError;
      // evitamos any -> interpretamos data como objeto genérico
      const respData = e.response?.data as Record<string, unknown> | undefined;
      const backendMsg = (respData?.mensaje as string | undefined) ?? e.message;
      console.error("Error guardando sucursal:", err);
      alert("Error guardando sucursal: " + backendMsg);
    } finally {
      setSaving(false);
    }
  };

  const showingForm =
    pathname.endsWith("/create") || pathname.includes("/edit/");

  return (
    <div style={{ padding: 16 }}>
      <h2>Sucursales</h2>

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
            <button onClick={() => nav("/admin/sucursales/create")}>
              Crear sucursal
            </button>
          </div>

          {loading ? (
            <div>Cargando...</div>
          ) : errorMsg ? (
            <div style={{ color: "red" }}>{errorMsg}</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 6 }}>Nombre</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Tienda</th>
                  <th style={{ textAlign: "left", padding: 6 }}>Dirección</th>
                  <th style={{ padding: 6 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sucursales.map((s) => (
                  <tr key={s.id}>
                    <td style={{ padding: 6 }}>{s.nombre}</td>
                    <td style={{ padding: 6 }}>{s.numero_tienda ?? "-"}</td>
                    <td style={{ padding: 6 }}>{s.direccion ?? "-"}</td>
                    <td style={{ padding: 6 }}>
                      <button
                        onClick={() => nav(`/admin/sucursales/edit/${s.id}`)}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        style={{ marginLeft: 8 }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {sucursales.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: 12, textAlign: "center" }}
                    >
                      Sin sucursales
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {showingForm && (
        <div style={{ marginTop: 12, maxWidth: 560 }}>
          <h3>{editingId ? "Editar sucursal" : "Crear sucursal"}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 8 }}>
              <label>
                Nombre
                <input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>
                Número tienda
                <input
                  value={form.numero_tienda ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, numero_tienda: e.target.value }))
                  }
                />
              </label>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>
                Dirección
                <input
                  value={form.direccion ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                />
              </label>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </button>
              <button type="button" onClick={() => nav("/admin/sucursales")}>
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
