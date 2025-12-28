// backend/src/services/caja/obtenerMetricasVentas.service.ts

export function obtenerMetricasVentasDesdeRegistros(registros: any[]) {
  let totalVentas = 0;
  let totalEfectivo = 0;
  let totalTarjetas = 0;
  let totalBonos = 0;
  let totalPagosInternos = 0;
  let totalDiferencia = 0;

  for (const r of registros) {
    totalVentas += Number(r.venta_total_registrada || 0);
    totalEfectivo += Number(r.efectivo_en_caja || 0);
    totalTarjetas += Number(r.tarjetas || 0);
    totalBonos += Number(r.bonos_sodexo || 0);
    totalPagosInternos += Number(r.pagos_internos || 0);
    totalDiferencia += Number(r.diferencia || 0);
  }

  return {
    totalVentas,
    totalEfectivo,
    totalTarjetas,
    totalBonos,
    totalPagosInternos,
    totalDiferencia,

    // estos los dejamos preparados
    totalConvenios: 0,
    convenios: [],
  };
}
