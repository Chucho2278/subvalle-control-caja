// src/config/swagger.ts
import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Subvalle Control de Caja",
      version: "1.0.0",
      description: "Documentación interactiva de la API",
    },
    components: {
      schemas: {
        CajaInput: {
          type: "object",
          properties: {
            restaurante: { type: "string" },
            turno: { type: "string", enum: ["A", "B", "C", "D"] },
            ventaTotalRegistrada: { type: "number" },
            efectivoEnCaja: { type: "number" },
            tarjetas: { type: "number" },
            tarjetas_cantidad: { type: "integer" },
            convenios: { type: "number" },
            convenios_cantidad: { type: "integer" },
            bonosSodexo: { type: "number" },
            bonosSodexo_cantidad: { type: "integer" },
            pagosInternos: { type: "number" },
            pagosInternos_cantidad: { type: "integer" },
            observacion: { type: "string" },
          },
          required: [
            "restaurante",
            "turno",
            "ventaTotalRegistrada",
            "efectivoEnCaja",
            "tarjetas",
            "tarjetas_cantidad",
            "convenios",
            "convenios_cantidad",
            "bonosSodexo",
            "bonosSodexo_cantidad",
            "pagosInternos",
            "pagosInternos_cantidad",
          ],
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    servers: [{ url: "http://localhost:3000" }],
  },
  apis: ["./src/routes/*.ts"], //aquí indica que lea los comentarios JDOCS
});
