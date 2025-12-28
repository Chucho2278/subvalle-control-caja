// src/pages/LoginPage.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  saveToken,
  saveUser,
  getToken,
  getUser,
  parseJwt,
} from "../utils/authService";
import type { UserMinimal } from "../auth/AuthContext";

type LocationState = { from?: { pathname?: string } };

interface LoginResponse {
  token: string;
  id?: number;
  nombre?: string;
  rol?: string;
  sucursal_id?: number | null;
  restaurante?: string | null; // si el backend lo envía
  mensaje?: string;
}

export default function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | undefined)?.from?.pathname;

  const [email, setEmail] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) return;

    if (from) {
      nav(from, { replace: true });
      return;
    }
    if (user?.rol === "administrador") nav("/admin", { replace: true });
    else if (user?.rol === "cajero") nav("/cajero", { replace: true });
    else nav("/dashboard", { replace: true });
  }, [from, nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, contraseña }),
      });

      const body: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        const maybeResp = body as Partial<LoginResponse>;
        throw new Error(maybeResp.mensaje ?? "Credenciales inválidas");
      }

      const data = body as LoginResponse;
      if (!data?.token) {
        throw new Error("Respuesta inválida del servidor (falta token)");
      }

      // Guardar token en sessionStorage
      saveToken(data.token);

      // Decodificar payload para extraer info si viene allí
      const payload = parseJwt<Record<string, unknown>>(data.token);

      // Normalizamos rol a los valores permitidos (evita string genérico)
      let normalizedRole: "administrador" | "cajero" | null = null;
      if (data.rol === "administrador" || data.rol === "cajero") {
        normalizedRole = data.rol;
      } else if (typeof payload?.["rol"] === "string") {
        if (payload["rol"] === "administrador" || payload["rol"] === "cajero") {
          normalizedRole = payload["rol"] as "administrador" | "cajero";
        }
      } else if (typeof payload?.["role"] === "string") {
        if (
          payload["role"] === "administrador" ||
          payload["role"] === "cajero"
        ) {
          normalizedRole = payload["role"] as "administrador" | "cajero";
        }
      }

      // Construimos objeto estrictamente del tipo UserMinimal (coincide con UserStored)
      const userObj: UserMinimal = {
        id:
          typeof data.id === "number"
            ? data.id
            : typeof payload?.["userId"] === "number"
            ? (payload["userId"] as number)
            : null,
        nombre:
          typeof data.nombre === "string"
            ? data.nombre
            : typeof payload?.["nombre"] === "string"
            ? (payload["nombre"] as string)
            : null,
        rol: normalizedRole ?? null,
        sucursal_id:
          typeof data.sucursal_id === "number"
            ? data.sucursal_id
            : typeof payload?.["sucursal_id"] === "number"
            ? (payload["sucursal_id"] as number)
            : null,
        restaurante:
          typeof data.restaurante === "string"
            ? data.restaurante
            : typeof payload?.["sucursal_nombre"] === "string"
            ? (payload["sucursal_nombre"] as string)
            : null,
      };

      // Guardamos usuario (tipo coincide con saveUser)
      saveUser(userObj);

      // Redirección según rol / origen
      if (from) {
        nav(from, { replace: true });
        return;
      }
      if (userObj.rol === "administrador") nav("/admin", { replace: true });
      else if (userObj.rol === "cajero") nav("/cajero", { replace: true });
      else nav("/dashboard", { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error en login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ paddingTop: 40 }}>
      <img
        src="/logo.png"
        alt="Logo"
        style={{ width: 300, height: 100, marginBottom: 20 }}
      />
      <h1 className="app-title">CONTROL DE CAJA</h1>

      <form onSubmit={onSubmit} style={{ width: 360, textAlign: "center" }}>
        {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 12 }}>
          <input
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div style={{ marginBottom: 12, position: "relative" }}>
          <input
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 6,
              border: "1px solid #ccc",
            }}
            type={showPass ? "text" : "password"}
            placeholder="Contraseña"
            value={contraseña}
            onChange={(e) => setContraseña(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            style={{
              position: "absolute",
              right: 8,
              top: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {showPass ? "🙈" : "👁️"}
          </button>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              borderRadius: 6,
              background: "#064e3b",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
