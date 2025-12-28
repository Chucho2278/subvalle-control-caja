// frontend/src/pages/AdminPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/authService";
import AdminNavbar from "../components/AdminNavbar";

export default function AdminPage() {
  const nav = useNavigate();

  const rawUser = getUser();
  const user =
    rawUser && typeof rawUser === "object"
      ? (rawUser as Record<string, unknown>)
      : null;

  const userRole =
    (user?.rol as "cajero" | "administrador" | undefined) ??
    (user?.role as "cajero" | "administrador" | undefined);

  useEffect(() => {
    // opcional: nav("/admin/registros");
  }, [nav]);

  return (
    <div>
      <AdminNavbar />

      <div style={{ padding: 20 }}>
        <h2>Panel Administrador</h2>
        <p>
          Bienvenid@, Aquí puedes ver y gestionar registros, convenios, usuarios
          y reportes.
        </p>

        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button onClick={() => nav("/admin/registros")}>Ver Registros</button>

          {userRole === "administrador" && (
            <>
              <button onClick={() => nav("/admin/descuadres")}>
                Informe Descuadres
              </button>
              <button onClick={() => nav("/admin/metricas")}>
                Métricas Ventas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
