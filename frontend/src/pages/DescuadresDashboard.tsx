// frontend/src/pages/DescuadresDashboard.tsx
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { getToken } from "../utils/authService";

/** Tipos */
type TopRow = {
  cajero_cedula: string | null;
  cajero_nombre: string | null;
  faltantes_count: number;
  faltantes_total: number;
  sobrantes_count: number;
  sobrantes_total: number;
  total_registros: number;
  neto: number;
};

type Sucursal = {
  id: number;
  nombre: string;
};

/** Guard helpers */
function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function toStringSafe(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  return "";
}
function toNumberSafe(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const parsed = Number(String(v).replace(",", "."));
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** Parseadores seguros */
const parseTopRow = (raw: unknown): TopRow | null => {
  if (!isObject(raw)) return null;
  const cajero_cedula = toStringSafe(raw.cajero_cedula) || null;
  const cajero_nombre = toStringSafe(raw.cajero_nombre) || null;
  return {
    cajero_cedula,
    cajero_nombre,
    faltantes_count: Math.trunc(toNumberSafe(raw.faltantes_count)),
    faltantes_total: toNumberSafe(raw.faltantes_total),
    sobrantes_count: Math.trunc(toNumberSafe(raw.sobrantes_count)),
    sobrantes_total: toNumberSafe(raw.sobrantes_total),
    total_registros: Math.trunc(toNumberSafe(raw.total_registros)),
    neto: toNumberSafe(raw.neto),
  };
};

const parseSucursales = (body: unknown): Sucursal[] => {
  if (!isObject(body)) return [];
  const maybeArr = (body as Record<string, unknown>).sucursales;
  if (!Array.isArray(maybeArr)) return [];
  return maybeArr
    .map((r) => {
      if (!isObject(r)) return null;
      const id = Math.trunc(toNumberSafe(r.id ?? r.sucursal_id));
      const nombre = toStringSafe(
        r.nombre ?? r.sucursal_nombre ?? r.restaurante
      );
      if (!id || !nombre) return null;
      return { id, nombre };
    })
    .filter((x): x is Sucursal => x !== null);
};

/** Componente */
export default function DescuadresDashboard(): ReactElement {
  const nav = useNavigate();

  // fechas por defecto (últimos 7 días)
  const today = new Date();
  const toDefault = today.toISOString().slice(0, 10);
  const fromDate = new Date(today);
  fromDate.setDate(today.getDate() - 7);
  const fromDefault = fromDate.toISOString().slice(0, 10);

  const [from, setFrom] = useState<string>(fromDefault);
  const [to, setTo] = useState<string>(toDefault);
  const [sucursalesOpts, setSucursalesOpts] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState<string>("");

  const [limit, setLimit] = useState<number>(10);

  const [faltantes, setFaltantes] = useState<TopRow[]>([]);
  const [sobrantes, setSobrantes] = useState<TopRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // cargar sucursales (si existe endpoint)
    (async () => {
      try {
        const token = getToken();
        const res = await fetch("/api/sucursales", {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) return;
        const body = await res.json().catch(() => ({}));
        const parsed = parseSucursales(body);
        setSucursalesOpts(parsed);
      } catch (err) {
        console.error("Error cargando sucursales:", err);
      }
    })();
    //* eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPesos = (n: number | null | undefined) => {
    const v = Number(n ?? 0) || 0;
    return v.toLocaleString("es-CO", { maximumFractionDigits: 0 });
  };

  const buildQuery = (extra?: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams();
    q.set("from", from);
    q.set("to", to);
    if (sucursalId) q.set("sucursal_ids", sucursalId);
    q.set("limit", String(limit));
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined && v !== null && String(v) !== "")
          q.set(k, String(v));
      }
    }
    return q.toString();
  };

  const fetchTop = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!from || !to) {
        setError("Seleccione un rango válido (from / to).");
        setLoading(false);
        return;
      }

      const token = getToken();
      const qs = buildQuery();
      const res = await fetch("/api/caja/descuadres/top?" + qs, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Error ${res.status} ${txt}`);
      }
      const body = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;

      const rawF = Array.isArray(body.faltantes) ? body.faltantes : [];
      const rawS = Array.isArray(body.sobrantes) ? body.sobrantes : [];

      const parsedF = rawF
        .map((r) => parseTopRow(r))
        .filter((x): x is TopRow => x !== null)
        .slice(0, limit);

      const parsedS = rawS
        .map((r) => parseTopRow(r))
        .filter((x): x is TopRow => x !== null)
        .slice(0, limit);

      setFaltantes(parsedF);
      setSobrantes(parsedS);
    } catch (err: unknown) {
      console.error("Error fetchTop:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setError(null);
    try {
      const token = getToken();
      const qs = buildQuery();
      const res = await fetch("/api/caja/descuadres/export?" + qs, {
        method: "GET",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Error ${res.status} ${txt}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      let filename = `descuadres-${from}-to-${to}.xlsx`;
      const match = /filename="?([^"]+)"?/.exec(cd);
      if (match && match[1]) filename = match[1];

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      console.error("Error export:", err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    // carga inicial
    fetchTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h1>Informe — Top Descuadres (Cajeros)</h1>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label>
          From:
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>

        <label>
          To:
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>

        <label>
          Sucursal:
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
          >
            <option value="">— Todas —</option>
            {sucursalesOpts.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.nombre}
              </option>
            ))}
          </select>
        </label>

        <label>
          Límite:
          <input
            type="number"
            min={1}
            max={10}
            value={String(limit)}
            onChange={(e) =>
              setLimit(Math.max(1, Math.min(100, Number(e.target.value || 10))))
            }
            style={{ width: 80 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={fetchTop} disabled={loading}>
            {loading ? "Cargando..." : "Buscar"}
          </button>
          <button onClick={handleExport}>Exportar Excel</button>
          <button onClick={() => nav(-1)}>Volver</button>
        </div>
      </div>

      {error && (
        <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>
      )}

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            minWidth: 320,
            flex: 1,
            border: "2px solid #f5c2c2",
            borderRadius: 8,
            padding: 12,
            backgroundColor: "#fff5f5",
          }}
        >
          <h3 style={{ color: "#b02a37", marginTop: 0 }}>
            🔴 Top Cajeros con FALTANTES
          </h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}
                >
                  #
                </th>
                <th
                  style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}
                >
                  Cédula
                </th>
                <th
                  style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}
                >
                  Nombre
                </th>
                <th
                  style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}
                >
                  Registros
                </th>
                <th
                  style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}
                >
                  Total menos
                </th>
              </tr>
            </thead>
            <tbody>
              {faltantes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 8 }}>
                    No hay resultados.
                  </td>
                </tr>
              )}
              {faltantes.map((r, i) => (
                <tr key={`${r.cajero_cedula ?? "x"}-${i}`}>
                  <td style={{ padding: "6px 4px" }}>{i + 1}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {r.cajero_cedula ?? "-"}
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    {r.cajero_nombre ?? "-"}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    {r.faltantes_count}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    {formatPesos(r.faltantes_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div
          style={{
            minWidth: 320,
            flex: 1,
            border: "2px solid #badbcc",
            borderRadius: 8,
            padding: 12,
            backgroundColor: "#f0fff4",
          }}
        >
          <h3 style={{ color: "#0f5132", marginTop: 0 }}>
            🟢 Top Cajeros con SOBRANTES
          </h3>

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}
                >
                  #
                </th>
                <th
                  style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}
                >
                  Cédula
                </th>
                <th
                  style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}
                >
                  Nombre
                </th>
                <th
                  style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}
                >
                  Registros
                </th>
                <th
                  style={{ textAlign: "right", borderBottom: "1px solid #ccc" }}
                >
                  Total pasado
                </th>
              </tr>
            </thead>
            <tbody>
              {sobrantes.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 8 }}>
                    No hay resultados.
                  </td>
                </tr>
              )}
              {sobrantes.map((r, i) => (
                <tr key={`${r.cajero_cedula ?? "x"}-${i}`}>
                  <td style={{ padding: "6px 4px" }}>{i + 1}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {r.cajero_cedula ?? "-"}
                  </td>
                  <td style={{ padding: "6px 4px" }}>
                    {r.cajero_nombre ?? "-"}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    {r.sobrantes_count}
                  </td>
                  <td style={{ padding: "6px 4px", textAlign: "right" }}>
                    {formatPesos(r.sobrantes_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
