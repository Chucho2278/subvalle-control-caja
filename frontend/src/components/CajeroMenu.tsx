// frontend/src/components/CajeroMenu.tsx
import { type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { clearAuth, getUser } from "../utils/authService";

/** Tipo local mínimo para el user almacenado */
type UserStored = {
  nombre?: string;
  rol?: "cajero" | "administrador";
  role?: "cajero" | "administrador";
  restaurante?: string;
  sucursal_id?: number | null;
};

export default function CajeroMenu(): ReactElement {
  const navigate = useNavigate();
  const raw = getUser();
  const user = raw && typeof raw === "object" ? (raw as UserStored) : null;

  const rol =
    (user?.rol as "cajero" | "administrador" | undefined) ??
    (user?.role as "cajero" | "administrador" | undefined);

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  // Ruta de creación para admin (ajusta si en tu App.tsx usas otra)
  const adminCreateRuta = "/admin/registros/create"; // <- coincidir con App.tsx
  const adminListRuta = "/admin/registros";

  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontWeight: 600 }}>
        {user?.nombre ? `Hola, ${user.nombre}` : "Usuario"}
      </div>

      {(rol === "cajero" || rol === "administrador") && (
        <button
          type="button"
          onClick={() => {
            if (rol === "administrador") {
              // Si en App.tsx usas otra ruta para crear desde admin,
              // cambia adminCreateRuta arriba para que coincida.
              navigate(adminCreateRuta);
            } else {
              navigate("/cajero/registrar");
            }
          }}
        >
          Registrar caja
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          if (rol === "administrador") navigate(adminListRuta);
          else navigate("/cajero/registros");
        }}
      >
        Ver registros
      </button>

      <button type="button" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </div>
  );
}
