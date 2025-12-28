// frontend/src/api/index.ts
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

/**
 * Base URL tomada de Vite env: VITE_API_URL
 * Si no la defines, se usa http://localhost:3000/api
 */
const rawBase =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:3000/api";
const baseURL = rawBase.replace(/\/+$/, ""); // quitar slash final si lo hay

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

/**
 * Interceptor de requests:
 * - añade Authorization: Bearer <token> si hay token en sessionStorage
 * - uso InternalAxiosRequestConfig para que coincida con la firma interna de axios
 */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    try {
      // tu authService guarda token en sessionStorage según lo compartido antes
      const token =
        sessionStorage.getItem("token") ?? localStorage.getItem("token");
      if (token) {
        const existing =
          (config.headers as Record<string, string> | undefined) ?? {};
        config.headers = {
          ...existing,
          Authorization: `Bearer ${token}`,
        } as InternalAxiosRequestConfig["headers"];
      }
    } catch {
      // no rompemos la petición por error leyendo storage
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
