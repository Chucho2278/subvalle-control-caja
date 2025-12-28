// src/routes/convenios.routes.ts
import { Router } from "express";
import {
  registerConvenio,
  listConvenios,
  getConvenio,
  updateConvenio,
  deleteConvenio,
} from "../controllers/convenio.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";

console.log("[routes] cargando rutas /api/convenios");

const router = Router();

/**
 * POST /api/convenios
 * Crear convenio (solo admin)
 */
router.post("/", authenticate, authorize("administrador"), registerConvenio);

/**
 * GET /api/convenios
 * Listar convenios (admin)
 */
router.get(
  "/",
  authenticate,
  authorize("cajero", "administrador"),
  listConvenios
);

/**
 * GET /api/convenios/:id
 * Obtener convenio por id (admin)
 */
router.get("/:id", authenticate, authorize("administrador"), getConvenio);

/**
 * PUT /api/convenios/:id
 * Actualizar convenio (admin)
 */
router.put("/:id", authenticate, authorize("administrador"), updateConvenio);

/**
 * DELETE /api/convenios/:id
 * Eliminar convenio (admin)
 */
router.delete("/:id", authenticate, authorize("administrador"), deleteConvenio);

export default router;
