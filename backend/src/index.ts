// backend/src/index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import cajaRoutes from "./routes/caja.routes";
import authRoutes from "./routes/auth.routes";
import sucursalRoutes from "./routes/sucursal.routes";
import usuarioRoutes from "./routes/usuario.routes";
import { authenticate } from "./middlewares/auth.middleware";
import conveniosRoutes from "./routes/convenios.routes";
import auditoriasRouter from "./routes/auditorias.routes";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import {
  exportarResumenExcel,
  obtenerTopDescuadres,
} from "./controllers/caja.controller";

dotenv.config();

const app = express();

// 🚨 DESACTIVAR ETAG
app.set("etag", false);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Allow Authorization header explicitly to avoid preflight issues
app.use(
  cors({
    origin: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas públicas / auth
app.use("/api/auth", authRoutes);
app.use("/api/usuarios", usuarioRoutes);

// Montar auditorias
app.use("/api/auditorias", auditoriasRouter);

// Protegemos las rutas de caja con authenticate: así req.user estará disponible en controllers
app.use("/api/caja", authenticate, cajaRoutes);

// Rutas adicionales de sucursales: montamos BOTH plural y singular para compatibilidad
app.use("/api/sucursales", sucursalRoutes);
app.use("/api/sucursal", sucursalRoutes);

// Convenios
app.use("/api/convenios", conveniosRoutes);

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Endpoints de prueba / debug que tenías
app.post("/api/convenios-debug", (req, res) => {
  console.log("DEBUG: llega POST /api/convenios-debug body:", req.body);
  res.json({ ok: true, received: req.body });
});

// Ruta pública raíz
app.get("/", (_req: Request, res: Response) =>
  res.send("API de Control de Caja Subvalle")
);

type ExtendedRequest = Request & {
  user?: {
    id: number;
    rol?: "cajero" | "administrador";
    role?: "cajero" | "administrador";
    sucursal_id?: number | null;
  } | null;
};

// Endpoint temporal de debug: devuelve lo que haya en req.user
app.get("/api/whoami", authenticate, (req: ExtendedRequest, res: Response) => {
  res.json({ user: req.user ?? null });
});

// imprimir rutas registradas (útil para debug)
const routes: string[] = [];
(app._router?.stack || []).forEach((middleware: any) => {
  if (middleware.route) {
    const path = middleware.route?.path;
    const methods = Object.keys(middleware.route.methods || {}).join(",");
    routes.push(`${methods.toUpperCase()} ${path}`);
  } else if (middleware.name === "router" && middleware.handle?.stack) {
    middleware.handle.stack.forEach((handler: any) => {
      if (handler.route) {
        const path = handler.route.path;
        const methods = Object.keys(handler.route.methods || {}).join(",");
        routes.push(`${methods.toUpperCase()} ${handler.route.path}`);
      }
    });
  }
});
console.log("[server] rutas registradas:", routes);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
