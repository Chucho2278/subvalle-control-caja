const { defineConfig } = require("cypress");

module.exports = defineConfig({
  video: true, // ✅ AQUÍ SÍ FUNCIONA
  videoCompression: 32, // opcional, recomendado
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    setupNodeEvents(on, config) {},
  },
});
