// src/utils/jwt.ts
import * as jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

if (!JWT_SECRET) {
  console.error(
    "JWT_SECRET no está definido en .env. Define JWT_SECRET para firmar tokens."
  );
  // opcional: lanzar error para detener el servidor en dev
  // throw new Error("JWT_SECRET missing");
}

export interface TokenPayload {
  userId: number;
  rol: "cajero" | "administrador";
  // sucursal_id es opcional — algunos tokens antiguos pueden no llevarlo
  sucursal_id?: number | null;
}

/**
 * Firma un JWT con payload y opciones de expiración.
 */
export function signToken(payload: TokenPayload): string {
  const options = { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions;
  return jwt.sign(payload as any, JWT_SECRET as string, options);
}

/**
 * Verifica un JWT y devuelve su payload tipado.
 * Lanza excepción si el token no es válido o expiró.
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string);
    // jwt.verify devuelve string | object; forzamos a TokenPayload
    return decoded as TokenPayload;
  } catch (err) {
    // Re-lanzamos para que el middleware capture y responda 401
    throw err;
  }
}
