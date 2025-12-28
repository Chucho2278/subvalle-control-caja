// backend/src/routes/auditorias.routes.ts
import { Router } from "express";
import {
  listarAuditorias,
  obtenerAccionesAuditoria,
} from "../controllers/auditoria.controller";

const router = Router();

// Ruta relativa: será montada por index.ts en /api/auditorias
router.get("/", listarAuditorias);
router.get("/acciones", obtenerAccionesAuditoria);

export default router;
