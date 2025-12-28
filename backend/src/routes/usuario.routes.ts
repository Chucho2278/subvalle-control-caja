//backend/src/routes/usuario.routes.ts
import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { auditAction } from "../middlewares/audit.middleware";
import {
  crearUsuarioController,
  listarUsuariosController,
  getUsuarioController,
  actualizarUsuarioController,
  asignarSucursalController,
  eliminarUsuarioController,
} from "../controllers/usuario.controller";

const router = Router();

router.post(
  "/",
  authenticate,
  authorize("administrador"),
  auditAction("CREAR", "USUARIO"),
  crearUsuarioController
);

router.get(
  "/",
  authenticate,
  authorize("administrador"),
  listarUsuariosController
);

router.get(
  "/:id",
  authenticate,
  authorize("administrador"),
  getUsuarioController
);

router.put(
  "/:id",
  authenticate,
  authorize("administrador"),
  auditAction("ACTUALIZAR", "USUARIO"),
  actualizarUsuarioController
);

router.put(
  "/:id/sucursal",
  authenticate,
  authorize("administrador"),
  auditAction("ASIGNAR_SUCURSAL", "USUARIO"),
  asignarSucursalController
);

router.delete(
  "/:id",
  authenticate,
  authorize("administrador"),
  auditAction("ELIMINAR", "USUARIO"),
  eliminarUsuarioController
);

export default router;
