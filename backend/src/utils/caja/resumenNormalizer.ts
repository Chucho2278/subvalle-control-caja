//src/utils/caja/resumenNormalizer.ts
export type ResumenRow = {
  turno: string;
  ventaTotal: number;
  efectivo: number;
  tarjetas: number;
  tarjetasCantidad: number;
  convenios: number;
  conveniosCantidad: number;
  bonos: number;
  bonosCantidad: number;
  pagosInternos: number;
  pagosInternosCantidad: number;
  dineroRegistrado: number;
  valorConsignar: number;
  diferencia: number;
};

export function normalizeResumenRow(raw: Record<string, unknown>): ResumenRow {
  const getNum = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v.replace(",", "."));
        if (!Number.isNaN(n)) return n;
      }
    }
    return 0;
  };

  const getStr = (...keys: string[]) => {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === "string" && v.trim()) return v;
      if (typeof v === "number") return String(v);
    }
    return "";
  };

  return {
    turno: getStr("turno"),
    ventaTotal: getNum("ventaTotal", "venta_total"),
    efectivo: getNum("efectivo", "efectivo_en_caja"),
    tarjetas: getNum("tarjetas"),
    tarjetasCantidad: getNum("tarjetas_cantidad"),
    convenios: getNum("convenios"),
    conveniosCantidad: getNum("convenios_cantidad"),
    bonos: getNum("bonos_sodexo"),
    bonosCantidad: getNum("bonos_sodexo_cantidad"),
    pagosInternos: getNum("pagos_internos"),
    pagosInternosCantidad: getNum("pagos_internos_cantidad"),
    dineroRegistrado: getNum("dinero_registrado"),
    valorConsignar: getNum("valor_consignar"),
    diferencia: getNum("diferencia"),
  };
}
