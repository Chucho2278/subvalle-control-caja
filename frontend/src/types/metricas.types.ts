// types/metricas.types.ts
export interface ConvenioDetalle {
  nombre: string;
  total: number;
}

export interface MetricasVentas {
  ventaTotal: number;
  efectivo: number;
  tarjetas: number;
  bonos: number;
  pagosInternos: number;
  diferencia: number;
  conveniosTotal: number;
  conveniosDetalle: ConvenioDetalle[];
}
