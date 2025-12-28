export type AuthUser = {
  id: number;
  rol: "cajero" | "administrador";
  sucursal_id?: number | null;
};
