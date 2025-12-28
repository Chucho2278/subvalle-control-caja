// src/auth/AuthProvider.tsx
import axios from "axios";
import { useState, type ReactNode } from "react";
import { AuthContext, type UserMinimal } from "./AuthContext";
import { loginApi } from "../api/auth";
import {
  saveToken,
  saveUser,
  getToken,
  getUser,
  clearAuth,
} from "../utils/authService";

/**
 * Interfaz local concordante con la respuesta del backend en /auth/login
 */
interface LoginResponseLocal {
  token: string;
  id?: number;
  nombre?: string;
  rol?: string | null;
  sucursal_id?: number | null;
  restaurante?: string | null; // nombre de la sucursal
  email?: string;
  mensaje?: string;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<UserMinimal | null>(() => getUser());

  const login = async (email: string, contraseña: string) => {
    try {
      const data = (await loginApi(
        email,
        contraseña
      )) as unknown as LoginResponseLocal;

      if (!data || !data.token) {
        throw new Error(data?.mensaje ?? "Credenciales inválidas");
      }

      // Normalizamos el rol a los valores esperados
      const normalizedRole =
        data.rol === "administrador"
          ? "administrador"
          : data.rol === "cajero"
          ? "cajero"
          : null;

      const u: UserMinimal = {
        id: data.id ?? null,
        nombre: data.nombre ?? null,
        rol: normalizedRole,
        sucursal_id: data.sucursal_id ?? null,
        email: data.email ?? null,
        restaurante: data.restaurante ?? null,
      };

      saveToken(data.token);
      saveUser(u);

      setToken(data.token);
      setUser(u);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const body = err.response?.data as { mensaje?: string } | undefined;
        const msg = body?.mensaje ?? err.message ?? "Credenciales inválidas";
        throw new Error(msg);
      }
      if (err instanceof Error) throw err;
      throw new Error("Credenciales inválidas");
    }
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
