import { Request } from "express";

export interface AuthUserPayload {
  id: number;
  rol?: "cajero" | "administrador";
  role?: "cajero" | "administrador";
  restaurante?: string | null;
  sucursal_id?: number | null;
}

export type AuthRequest = Request & {
  user?: AuthUserPayload | null;
};
