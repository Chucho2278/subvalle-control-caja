// frontend/src/components/AdminNavbar.tsx
import { useNavigate } from "react-router-dom";
import LogoutButton from "./LogoutButton";

export default function AdminNavbar() {
  const nav = useNavigate();

  return (
    <nav
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "8px 12px",
        borderBottom: "1px solid #eee",
        background: "#f8faf8",
      }}
    >
      <div style={{ fontWeight: 700 }}>Panel Admin</div>

      <button onClick={() => nav("/admin/registros")}>Ver registros</button>

      <button onClick={() => nav("/admin/auditorias")}>Auditorias</button>

      {/* Sucursales (dropdown) */}
      <details style={{ marginLeft: 8 }}>
        <summary style={{ cursor: "pointer" }}>Sucursales ▾</summary>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
          <button onClick={() => nav("/admin/sucursales/create")}>
            Crear sucursal
          </button>
          <button onClick={() => nav("/admin/sucursales")}>
            Ver sucursales
          </button>
        </div>
      </details>

      {/* Convenios */}
      <details style={{ marginLeft: 8 }}>
        <summary style={{ cursor: "pointer" }}>Convenios ▾</summary>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
          <button onClick={() => nav("/admin/convenios/create")}>
            Crear convenio
          </button>
          <button onClick={() => nav("/admin/convenios")}>Ver convenios</button>
        </div>
      </details>

      {/* Usuarios */}
      <details style={{ marginLeft: 8 }}>
        <summary style={{ cursor: "pointer" }}>Usuarios ▾</summary>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 6 }}>
          <button onClick={() => nav("/admin/usuarios/create")}>
            Crear usuario
          </button>
          <button onClick={() => nav("/admin/usuarios")}>Ver usuarios</button>
        </div>
      </details>

      <div style={{ marginLeft: "auto" }}>
        <LogoutButton />
      </div>
    </nav>
  );
}
