// frontend/src/App.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AdminPage from "./pages/AdminPage";
import RegistrosPage from "./pages/RegistrosPage";
import RegisterCajaPage from "./pages/RegisterCajaPage";
import ProtectedRoute from "./components/ProtectedRoute";
//import ResumenTurnosPage from "./pages/ResumenTurnosPage";
import ViewCajaPage from "./pages/ViewCajaPage";
import SucursalesPage from "./pages/SucursalesPage";
import ConveniosPage from "./pages/ConveniosPage";
import UsuariosPage from "./pages/UsuariosPage";
import AuditoriasPage from "./pages/AuditoriasPage";
import DescuadresDashboard from "./pages/DescuadresDashboard";
import MetricasVentasPage from "./pages/MetricasVentasPage";

/**
 * App principal — NO crea otro BrowserRouter (main.tsx ya lo hace).
 * Usa React.createElement (sin JSX). No usa `any`.
 */
export default function App(): React.ReactElement {
  const h = React.createElement;

  return h(
    Routes,
    null,
    // redirect root -> /login
    h(Route, {
      path: "/",
      element: h(Navigate, { to: "/login", replace: true }),
    }),

    // login
    h(Route, { path: "/login", element: h(LoginPage, null) }),

    // admin panel
    h(Route, {
      path: "/admin",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(AdminPage, null)
      ),
    }),

    // auditorías
    h(Route, {
      path: "/admin/auditorias",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(AuditoriasPage, null)
      ),
    }),

    // registros (admin)
    h(Route, {
      path: "/admin/registros",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(RegistrosPage, null)
      ),
    }),

    // crear registro (admin)
    h(Route, {
      path: "/admin/registros/create",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(RegisterCajaPage, null)
      ),
    }),

    // editar registro (admin)
    h(Route, {
      path: "/admin/registros/edit/:id",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(RegisterCajaPage, null)
      ),
    }),

    // sucursales (admin)
    h(Route, {
      path: "/admin/sucursales",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(SucursalesPage, null)
      ),
    }),
    h(Route, {
      path: "/admin/sucursales/create",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(SucursalesPage, null)
      ),
    }),
    h(Route, {
      path: "/admin/sucursales/edit/:id",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(SucursalesPage, null)
      ),
    }),

    // dashboard descuadres (admin)
    h(Route, {
      path: "/admin/descuadres",
      element: h(DescuadresDashboard, null),
    }),

    // convenios (admin)
    h(Route, {
      path: "/admin/convenios",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(ConveniosPage, null)
      ),
    }),
    h(Route, {
      path: "/admin/convenios/create",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(ConveniosPage, null)
      ),
    }),
    h(Route, {
      path: "/admin/convenios/edit/:id",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(ConveniosPage, null)
      ),
    }),

    // usuarios (admin)
    h(Route, {
      path: "/admin/usuarios",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(UsuariosPage, null)
      ),
    }),
    h(Route, {
      path: "/admin/usuarios/create",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(UsuariosPage, null)
      ),
    }),
    h(Route, {
      path: "/admin/usuarios/edit/:id",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(UsuariosPage, null)
      ),
    }),

    // rutas cajero
    h(Route, {
      path: "/cajero",
      element: h(
        ProtectedRoute,
        { roles: ["cajero"] as Array<"administrador" | "cajero"> },
        h(Navigate, { to: "/cajero/registros", replace: true })
      ),
    }),
    h(Route, {
      path: "/cajero/registros",
      element: h(
        ProtectedRoute,
        { roles: ["cajero"] as Array<"administrador" | "cajero"> },
        h(RegistrosPage, null)
      ),
    }),
    h(Route, {
      path: "/cajero/registrar",
      element: h(
        ProtectedRoute,
        { roles: ["cajero"] as Array<"administrador" | "cajero"> },
        h(RegisterCajaPage, null)
      ),
    }),

    // ver caja (ambos roles)
    h(Route, {
      path: "/caja/view/:id",
      element: h(
        ProtectedRoute,
        {
          roles: ["cajero", "administrador"] as Array<
            "administrador" | "cajero"
          >,
        },
        h(ViewCajaPage, null)
      ),
    }),

    // dashboard / resumen
    h(Route, {
      /*
      path: "/dashboard",
      element: h(
        ProtectedRoute,
        {
          roles: ["administrador", "cajero"] as Array<
            "administrador" | "cajero"
          >,
        },
        h(ResumenTurnosPage, null)
      ),
    */
    }),

    // métricas de ventas
    h(Route, {
      path: "/admin/metricas",
      element: h(
        ProtectedRoute,
        { roles: ["administrador"] as Array<"administrador" | "cajero"> },
        h(MetricasVentasPage, null)
      ),
    }),

    // fallback -> login
    h(Route, {
      path: "*",
      element: h(Navigate, { to: "/login", replace: true }),
    })
  );
}
