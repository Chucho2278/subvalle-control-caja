// src/components/ProtectedRoute.tsx
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  getToken,
  isTokenExpired,
  parseJwt,
  clearAuth,
} from "../utils/authService";

interface Props {
  children?: ReactNode; // <-- ahora opcional
  roles?: Array<"administrador" | "cajero">;
}

export default function ProtectedRoute({ children, roles = [] }: Props) {
  const token = getToken();

  if (!token) return <Navigate to="/login" replace />;

  if (isTokenExpired(token)) {
    clearAuth();
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0) {
    const payload = parseJwt<{
      rol?: "administrador" | "cajero";
      role?: "administrador" | "cajero";
    }>(token);
    const userRole = (payload?.rol ?? payload?.role) as
      | "administrador"
      | "cajero"
      | undefined;
    if (!userRole || !roles.includes(userRole)) {
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
