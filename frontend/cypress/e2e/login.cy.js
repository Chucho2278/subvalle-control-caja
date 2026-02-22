describe("Login", () => {
  it("Debe permitir iniciar sesión", () => {
    cy.visit("http://localhost:5173/login");

    cy.get('input[type="email"]').type("admin1@subvalle.com");
    cy.get('input[type="password"]').type("Admin123");
    cy.contains("Entrar").click();
  });
});
