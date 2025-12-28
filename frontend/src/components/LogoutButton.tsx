// src/components/LogoutButton.tsx
import { useNavigate } from "react-router-dom";
import { clearAuth } from "../utils/authService";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate("/login", { replace: true });
  };

  return (
    <button onClick={handleLogout} style={{ cursor: "pointer" }}>
      Cerrar sesión
    </button>
  );
}
