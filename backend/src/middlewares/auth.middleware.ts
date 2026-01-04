// src/middlewares/auth.middleware.ts
import { Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt";
import { AuthUser } from "../types/auth";
import { AuthRequest } from "../types/express-request";

/**
 * authenticate
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  console.log("AUTH HEADER:", authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    console.warn("authenticate: token faltante o formato incorrecto");
    return res.status(401).json({ mensaje: "Token faltante" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const payload: TokenPayload = verifyToken(token);
    console.log("authenticate -> payload:", payload);
    const user: AuthUser = {
      id: payload.userId,
      rol: payload.rol,
      sucursal_id: payload.sucursal_id ?? null,
    };
    req.user = user;
    next();
  } catch (error) {
    console.error("authenticate middleware error:", error);
    return res.status(401).json({ mensaje: "Token inválido" });
  }
}

/**
 * authorize
 */
export function authorize(...roles: Array<AuthUser["rol"]>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log("AUTHORIZE -> requiredRoles:", roles, " req.user:", req.user);
    if (!req.user) {
      console.warn("AUTHORIZE -> no req.user (no autenticado)");
      return res.status(401).json({ mensaje: "No autenticado" });
    }

    if (!roles.includes(req.user.rol)) {
      console.warn("AUTHORIZE -> acceso denegado. user.rol:", req.user.rol);
      return res.status(403).json({ mensaje: "Acceso denegado" });
    }

    next();
  };
}
