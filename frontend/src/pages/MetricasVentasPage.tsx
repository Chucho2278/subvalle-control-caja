// frontend/src/pages/MetricasVentasPage.tsx
import { useEffect, useState } from "react";
import type { MetricasVentas } from "../types/metricas.types";
import { getToken } from "../utils/authService";
import { useNavigate } from "react-router-dom";

/* HELPERS */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toNumberSafe(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}
function todayLocal(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function daysAgoLocal(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* COMPONENT */
export default function MetricasVentasPage() {
  const navigate = useNavigate();

  const [from, setFrom] = useState<string>(() => daysAgoLocal(7));
  const [to, setTo] = useState<string>(() => todayLocal());

  const [data, setData] = useState<MetricasVentas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // clave para forzar recreación del <table> cuando lleguen nuevos datos
  const [tableKey, setTableKey] = useState<string>(() => `${from}-${to}`);

  const fetchMetricas = async (fromArg = from, toArg = to) => {
    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({ from: fromArg, to: toArg });
      qs.append("_", String(Date.now())); // cache-buster

      const token = getToken();
      console.log("[frontend] fetchMetricas =>", { from: fromArg, to: toArg });

      const res = await fetch(
        `/api/caja/metricas/desglose-ventas?${qs.toString()}`,
        {
          method: "GET",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      console.log("[frontend] fetch http status:", res.status, res.statusText);

      if (!res.ok) {
        const txt = await res.text();
        try {
          const errJson = JSON.parse(txt);
          throw new Error(errJson.message || JSON.stringify(errJson));
        } catch {
          throw new Error(txt || `HTTP ${res.status}`);
        }
      }

      const body = await res.json();
      console.log("[frontend] body raw:", body);

      if (!isObject(body)) throw new Error("Respuesta inválida (no es objeto)");

      const result: MetricasVentas = {
        ventaTotal: toNumberSafe(body.ventaTotal),
        efectivo: toNumberSafe(body.efectivo),
        tarjetas: toNumberSafe(body.tarjetas),
        bonos: toNumberSafe(body.bonos),
        pagosInternos: toNumberSafe(body.pagosInternos),
        diferencia: toNumberSafe(body.diferencia),
        conveniosTotal: toNumberSafe(body.conveniosTotal),
        conveniosDetalle: Array.isArray(body.conveniosDetalle)
          ? body.conveniosDetalle.map((c) => ({
              nombre: String(
                isObject(c) && typeof c.nombre === "string"
                  ? c.nombre
                  : "Sin nombre"
              ),
              total: toNumberSafe(isObject(c) ? c.total : 0),
            }))
          : [],
      };

      console.log("[frontend] parsed result:", result);

      // actualizar estado Y clave de tabla para forzar recreación
      setData(result);
      setTableKey(`${from}-${to}`);
    } catch (err) {
      console.error("[frontend] fetch error:", err);
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricas(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // logs dentro del render para ver qué estado usa React
  console.log("[render] data:", data, "tableKey:", tableKey);

  const formatPesos = (n: number) =>
    n.toLocaleString("es-CO", { maximumFractionDigits: 0 });

  const rows =
    data === null
      ? []
      : [
          { concepto: "Venta total", valor: data.ventaTotal },
          { concepto: "Efectivo", valor: data.efectivo },
          { concepto: "Tarjetas", valor: data.tarjetas },
          { concepto: "Convenios (total)", valor: data.conveniosTotal },
          ...data.conveniosDetalle.map((c) => ({
            concepto: `↳ ${c.nombre}`,
            valor: c.total,
          })),
          { concepto: "Bonos", valor: data.bonos },
          { concepto: "Pagos internos", valor: data.pagosInternos },
          { concepto: "Diferencia", valor: data.diferencia },
        ];

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Volver</button>

      <h2>Métricas — Desglose de Ventas</h2>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 16,
          alignItems: "flex-end",
        }}
      >
        <label>
          Desde:
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ display: "block" }}
          />
        </label>

        <label>
          Hasta:
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ display: "block" }}
          />
        </label>

        <button onClick={() => fetchMetricas(from, to)} disabled={loading}>
          {loading ? "Consultar" : "Consultar"}
        </button>
      </div>

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>
          Error: {error}
          {error.toLowerCase().includes("401") && (
            <div>Revisa token (usa /api/whoami para probar).</div>
          )}
        </div>
      )}

      {data && (
        <table
          key={tableKey}
          style={{ width: "100%", borderCollapse: "collapse" }}
          data-testid="tabla-metricas"
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc" }}>
              <th style={{ textAlign: "left" }}>Concepto</th>
              <th style={{ textAlign: "right" }}>Valor</th>
              <th style={{ textAlign: "right" }}>%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const pct =
                data.ventaTotal > 0 ? (r.valor / data.ventaTotal) * 100 : 0;

              return (
                <tr key={r.concepto} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: "8px 4px" }}>{r.concepto}</td>
                  <td
                    style={{ textAlign: "right", padding: "8px 4px" }}
                    // identificador rápido para inspección DOM
                    data-testid={
                      r.concepto === "Venta total"
                        ? "venta-total-valor"
                        : undefined
                    }
                  >
                    ${formatPesos(r.valor)}
                  </td>
                  <td style={{ textAlign: "right", padding: "8px 4px" }}>
                    {pct.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!data && !loading && !error && (
        <div style={{ marginTop: 12, color: "#666" }}>
          No hay datos para mostrar.
        </div>
      )}
    </div>
  );
}
