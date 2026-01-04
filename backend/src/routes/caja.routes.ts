// backend/src/routes/caja.routes.ts
import { Router } from "express";
import {
  registrarCaja,
  listarCajas,
  obtenerCajaPorId,
  actualizarCajaParcial,
  exportarResumenExcel,
  obtenerResumenTurnos,
  eliminarCaja,
  obtenerTopDescuadres,
  exportarTopDescuadresExcel,
} from "../controllers/caja.controller";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { validateRequest } from "../middlewares/validate.middleware";
import { updateCajaSchema } from "../validators/caja.validator";
import { metricasDesgloseVentas } from "../controllers/caja.metricas.controller";
import { actualizarCajaParcialService } from "../services/caja/actualizarCaja.service";

const router = Router();

// Rutas CRUD + específicas — poner rutas concretas antes de "/:id"
router.post("/registrar", authorize("cajero", "administrador"), registrarCaja);
router.get("/", listarCajas);

// Rutas resumen
router.get(
  "/resumen",
  authorize("administrador", "cajero"),
  obtenerResumenTurnos
);
router.get("/resumen/excel", authorize("administrador"), exportarResumenExcel);

// Rutas de métricas / análisis
// (si deseas protegerla con authorize, descomenta authorize y ajusta roles)
router.get(
  "/metricas/desglose-ventas",
  /* authorize("administrador","cajero"), */ metricasDesgloseVentas
);

// Descuadres / export
router.get(
  "/descuadres/top",
  authorize("administrador", "cajero"),
  obtenerTopDescuadres
);
router.get(
  "/descuadres/export",
  authorize("administrador"),
  exportarTopDescuadresExcel
);

// Ahora la ruta por id (debe ir después de las rutas concretas)
router.get("/:id", authorize("cajero", "administrador"), obtenerCajaPorId);

router.patch(
  "/:id",
  authenticate,
  authorize("administrador"),
  validateRequest(updateCajaSchema),
  actualizarCajaParcial
);

router.delete("/:id", authorize("administrador"), eliminarCaja);

export default router;
