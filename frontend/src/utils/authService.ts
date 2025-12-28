// src/utils/authService.ts
export const TOKEN_KEY = "token";
const USER_KEY = "user";

export type Role = "administrador" | "cajero" | null;

export type UserStored = {
  id?: number | null;
  nombre?: string | null;
  rol?: Role;
  sucursal_id?: number | null;
  email?: string | null;
  restaurante?: string | null;
};

/** Guardar token y user en localStorage (persistente entre pestañas) */
export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function saveUser(user: UserStored): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser(): UserStored | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as UserStored) : null;
}
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Decodifica base64url del JWT y devuelve el payload tipado */
export function parseJwt<
  T extends Record<string, unknown> = Record<string, unknown>
>(token: string): T | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    if (typeof atob === "function") {
      const bin = atob(base64);
      const jsonStr = decodeURIComponent(
        Array.prototype.map
          .call(bin, (c: string) => {
            const code = c.charCodeAt(0);
            return "%" + ("00" + code.toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(jsonStr) as T;
    } else {
      // fallback Node-like
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const buf = (globalThis as any).Buffer?.from(base64, "base64");
      if (!buf) return null;
      return JSON.parse(buf.toString("utf8")) as T;
    }
  } catch {
    return null;
  }
}

/** Comprueba si token expiró (si no puede leer exp => considera expirado) */
export function isTokenExpired(token: string): boolean {
  const payload = parseJwt<{ exp?: number }>(token);
  if (!payload || typeof payload.exp !== "number") return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
