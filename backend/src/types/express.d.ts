import "express";

declare global {
  namespace Express {
    interface UserPayload {
      id: number;
      rol: "cajero" | "administrador";
      role?: "cajero" | "administrador";
      sucursal_id?: number | null;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
