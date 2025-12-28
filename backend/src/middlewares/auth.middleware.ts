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
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ mensaje: "Token faltante" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload: TokenPayload = verifyToken(token);

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
    if (!req.user) {
      return res.status(401).json({ mensaje: "No autenticado" });
    }

    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({ mensaje: "Acceso denegado" });
    }

    next();
  };
}
