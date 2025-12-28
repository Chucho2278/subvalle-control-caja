//backend/src/routes/sucursal.routes.ts
import { Router } from "express";
import {
  registerSucursal,
  listSucursales,
  getSucursal,
  updateSucursal,
  deleteSucursal,
} from "../controllers/sucursal.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { auditAction } from "../middlewares/audit.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("administrador"),
  auditAction("CREAR", "SUCURSAL"),
  registerSucursal
);

router.get(
  "/",
  authenticate,
  authorize("cajero", "administrador"),
  listSucursales
);

router.get(
  "/:id",
  authenticate,
  authorize("cajero", "administrador"),
  getSucursal
);

router.put(
  "/:id",
  authenticate,
  authorize("administrador"),
  auditAction("ACTUALIZAR", "SUCURSAL"),
  updateSucursal
);

router.delete(
  "/:id",
  authenticate,
  authorize("administrador"),
  auditAction("ELIMINAR", "SUCURSAL"),
  deleteSucursal
);

export default router;
