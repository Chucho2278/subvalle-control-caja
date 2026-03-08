// src/api/auth.ts
import type { AxiosResponse } from "axios";
import { api } from "./index";

export type LoginResponse = {
  token?: string;
  id?: number;
  nombre?: string;
  rol?: string;
  sucursal_id?: number | null;
  restaurante?: string | null;
  mensaje?: string;
};

export async function loginApi(email: string, contraseña: string) {
  // la instancia `api` ya tiene baseURL e interceptor para Authorization
  const res: AxiosResponse<LoginResponse> = await api.post("/auth/login", {
    email,
    contraseña,
  });
  return res.data;
}
