// backend/src/routes/auth.routes.ts
import { Router } from "express";
import { login } from "../controllers/auth.controller";

const router = Router();

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener token JWT
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - contraseña
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@subvalle.com
 *               contraseña:
 *                 type: string
 *                 example: AdminSubvalle123
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve token, rol e id
 */
router.post("/login", login);

export default router;
