//src/utils/calcularCaja.ts
export interface DatosCaja {
  ventaTotalRegistrada: number;
  efectivoEnCaja: number;
  tarjetas: number;
  convenios: number;
  bonosSodexo: number;
  pagosInternos: number;
  observacion?: string;
}

const formatCOP = (value: number) =>
  value.toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export function calcularCaja(datos: DatosCaja) {
  const {
    ventaTotalRegistrada,
    efectivoEnCaja,
    tarjetas,
    convenios,
    bonosSodexo,
    pagosInternos,
  } = datos;

  const valorAConsignar = efectivoEnCaja;
  const dineroRegistrado =
    efectivoEnCaja + tarjetas + convenios + bonosSodexo - pagosInternos;

  const diferencia = dineroRegistrado - ventaTotalRegistrada;

  let estado = "Caja OK";

  if (diferencia < 0) {
    estado = `Caja corta (${formatCOP(diferencia)})`;

    if (diferencia < -1000) {
      estado += " - Por favor, firmar descuento";
    }
  } else if (diferencia > 0) {
    estado = `Caja pasada en (${formatCOP(diferencia)})`;

    if (diferencia > 5000) {
      estado += " - Por favor, explique por qué está pasada la caja";
    }
  }

  return {
    valorAConsignar,
    dineroRegistrado,
    diferencia,
    estado,
  };
}
