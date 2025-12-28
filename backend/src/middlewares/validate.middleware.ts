import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

export function validateRequest(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        mensaje: "Datos inválidos",
        errores: result.error.issues,
      });
    }

    req.body = result.data;
    next();
  };
}
