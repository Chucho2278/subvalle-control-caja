// src/pages/UsuariosPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../api/index";
import type { AxiosError } from "axios";

type Usuario = {
  id: number;
  nombre: string;
  email?: string | null;
  rol?: "cajero" | "administrador" | null;
  sucursal_id?: number | null;
  sucursal_nombre?: string | null;
};

type SucursalOption = { id: number; nombre: string };

type UserForm = {
  nombre: string;
  email: string;
  rol: "cajero" | "administrador" | "";
  sucursal_id: number | null;
  contraseña: string;
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function getString(rec: Record<string, unknown>, key: string): string | null {
  const v = rec[key];
  return typeof v === "string" ? v : null;
}
function getNumber(rec: Record<string, unknown>, key: string): number | null {
  const v = rec[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function normalizeUsuario(raw: unknown): Usuario | null {
  if (!isRecord(raw)) return null;
  const id = getNumber(raw, "id") ?? getNumber(raw, "_id") ?? 0;
  const nombre = getString(raw, "nombre") ?? "";
  if (!nombre) return null;
  const email = getString(raw, "email");
  const rolStr = getString(raw, "rol");
  const rol =
    rolStr === "administrador" || rolStr === "cajero"
      ? (rolStr as "administrador" | "cajero")
      : null;
  const sucursal_id = getNumber(raw, "sucursal_id") ?? null;
  const sucursal_nombre = getString(raw, "sucursal_nombre") ?? null;
  return {
    id: Math.trunc(id),
    nombre,
    email,
    rol,
    sucursal_id,
    sucursal_nombre,
  };
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [sucursales, setSucursales] = useState<SucursalOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nav = useNavigate();
  const { pathname } = useLocation();
  const params = useParams<{ id?: string }>();
  const isEditing = typeof params.id === "string" && params.id.trim() !== "";

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>({
    nombre: "",
    email: "",
    rol: "" as "" | "cajero" | "administrador",
    sucursal_id: null,
    contraseña: "",
  });

  const load = async (): Promise<void> => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [uRes, sRes] = await Promise.all([
        api.get("/usuarios"),
        api.get("/sucursales"),
      ]);
      const uData = (uRes.data && (uRes.data.usuarios ?? uRes.data)) ?? [];
      const sData = (sRes.data && (sRes.data.sucursales ?? sRes.data)) ?? [];
      const usersArr = Array.isArray(uData) ? uData : [];
      const sucArr = Array.isArray(sData) ? sData : [];
      setUsuarios(
        usersArr.map(normalizeUsuario).filter((u): u is Usuario => u !== null)
      );
      const sOpts: SucursalOption[] = sucArr
        .map((it) => {
          if (!isRecord(it)) return null;
          const id = getNumber(it, "id") ?? getNumber(it, "sucursal_id") ?? 0;
          const nombre =
            getString(it, "nombre") ?? getString(it, "restaurante") ?? "";
          if (!nombre) return null;
          return { id: Math.trunc(id), nombre };
        })
        .filter((s): s is SucursalOption => s !== null);
      setSucursales(sOpts);
    } catch (err) {
      const e = err as AxiosError;
      if (e.response?.status === 401) {
        alert("Sesión expirada. Inicia sesión nuevamente.");
        nav("/login");
        return;
      }
      console.error("Error cargando usuarios o sucursales:", err);
      setErrorMsg("Error cargando datos. Revisa la consola.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si estamos en edit/:id, prefilar el form (priorizar lista local, fallback a backend)
  useEffect(() => {
    if (!isEditing) {
      if (pathname.endsWith("/create")) {
        setForm({
          nombre: "",
          email: "",
          rol: "" as "" | "cajero" | "administrador",
          sucursal_id: null,
          contraseña: "",
        });
      }
      setEditingId(null);
      return;
    }

    const id = Number(params.id);
    if (!id || isNaN(id)) {
      setErrorMsg("Id inválido");
      setForm({
        nombre: "",
        email: "",
        rol: "" as "" | "cajero" | "administrador",
        sucursal_id: null,
        contraseña: "",
      });
      setEditingId(null);
      return;
    }

    const found = usuarios.find((u) => u.id === id);
    if (found) {
      setForm({
        nombre: found.nombre,
        email: found.email ?? "",
        rol: (found.rol ?? "") as "" | "cajero" | "administrador",
        sucursal_id: found.sucursal_id ?? null,
        contraseña: "",
      });
      setEditingId(id);
      return;
    }

    // fallback: pedir al backend por id
    (async () => {
      setLoading(true);
      try {
        const r = await api.get(`/usuarios/${id}`);
        const rec = (r.data && (r.data.usuario ?? r.data)) ?? null;
        const u = normalizeUsuario(rec);
        if (u) {
          setForm({
            nombre: u.nombre,
            email: u.email ?? "",
            rol: (u.rol ?? "") as "" | "cajero" | "administrador",
            sucursal_id: u.sucursal_id ?? null,
            contraseña: "",
          });
          setEditingId(u.id);
        } else {
          setErrorMsg("Usuario no encontrado");
          setEditingId(null);
        }
      } catch (err) {
        const e = err as AxiosError;
        if (e.response?.status === 401) {
          alert("Sesión expirada. Inicia sesión nuevamente.");
          nav("/login");
        } else if (e.response?.status === 404) {
          setErrorMsg("Usuario no encontrado");
        } else {
          console.warn("No se pudo cargar usuario remoto", err);
          setErrorMsg("Error al cargar usuario (ver consola)");
        }
        setEditingId(null);
        setForm({
          nombre: "",
          email: "",
          rol: "" as "" | "cajero" | "administrador",
          sucursal_id: null,
          contraseña: "",
        });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, params.id, usuarios, pathname]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || !form.rol) {
      alert("Todos los campos marcados son obligatorios");
      return;
    }
    if (!editingId && !form.contraseña.trim()) {
      alert("La contraseña es obligatoria para nuevos usuarios");
      return;
    }
    if (form.rol === "cajero" && !form.sucursal_id) {
      alert("Debe asignar una sucursal al cajero");
      return;
    }

    const payload: Record<string, unknown> = {
      nombre: form.nombre.trim(),
      email: form.email.trim(),
      rol: form.rol,
      sucursal_id: form.sucursal_id ?? null,
    };
    if (!editingId) payload.contraseña = form.contraseña.trim();

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload);
        alert("Usuario actualizado correctamente");
      } else {
        await api.post("/usuarios", payload);
        alert("Usuario creado correctamente");
      }
      nav("/admin/usuarios");
      await load();
    } catch (err) {
      const e = err as AxiosError;
      if (e.response?.status === 400) {
        const data = e.response?.data as { mensaje?: string } | undefined;
        alert(data?.mensaje || "Datos inválidos");
      } else if (e.response?.status === 401) {
        alert("Sesión expirada, inicia sesión nuevamente.");
        nav("/login");
      } else {
        console.error("Error guardando usuario:", err);
        alert("Error guardando usuario. Ver consola.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (!confirm("¿Eliminar este usuario?")) return;
    try {
      await api.delete(`/usuarios/${id}`);
      alert("Usuario eliminado correctamente");
      await load();
    } catch (err) {
      console.error("Error eliminando usuario:", err);
      alert("Error al eliminar usuario");
    }
  };

  const showingForm =
    pathname.endsWith("/create") || pathname.includes("/edit/");

  return (
    <div style={{ padding: 16 }}>
      <h2>Usuarios</h2>

      {!showingForm && (
        <>
          <div style={{ marginBottom: 12 }}>
            <button onClick={() => nav("/admin")}>Volver</button>{" "}
            <button onClick={() => nav("/admin/usuarios/create")}>
              Crear usuario
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
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Sucursal</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email ?? "-"}</td>
                    <td>{u.rol ?? "-"}</td>
                    <td>{u.sucursal_nombre ?? "-"}</td>
                    <td>
                      <button
                        onClick={() => nav(`/admin/usuarios/edit/${u.id}`)}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        style={{ marginLeft: 8 }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
                {usuarios.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: 12, textAlign: "center" }}
                    >
                      Sin usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </>
      )}

      {showingForm && (
        <div style={{ marginTop: 12, maxWidth: 600 }}>
          <h3>{editingId ? "Editar usuario" : "Crear usuario"}</h3>
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
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                />
              </label>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>
                Rol
                <select
                  value={form.rol}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      rol: e.target.value as "cajero" | "administrador" | "",
                    }))
                  }
                  required
                >
                  <option value="">Seleccionar</option>
                  <option value="cajero">Cajero</option>
                  <option value="administrador">Administrador</option>
                </select>
              </label>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label>
                Sucursal
                <select
                  value={form.sucursal_id ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      sucursal_id: e.target.value
                        ? Number(e.target.value)
                        : null,
                    }))
                  }
                >
                  <option value="">Sin asignar</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {!editingId && (
              <div style={{ marginBottom: 8 }}>
                <label>
                  Contraseña
                  <input
                    type="password"
                    value={form.contraseña}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contraseña: e.target.value }))
                    }
                    required
                  />
                </label>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving}>
                {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
              </button>
              <button type="button" onClick={() => nav("/admin/usuarios")}>
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
