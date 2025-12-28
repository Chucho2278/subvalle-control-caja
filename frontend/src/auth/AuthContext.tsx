// src/auth/AuthContext.tsx
import React from "react";
import type { UserStored } from "../utils/authService";

export type UserMinimal = UserStored;

export type AuthContextType = {
  token: string | null;
  user: UserMinimal | null;
  login: (email: string, contraseña: string) => Promise<void>;
  logout: () => void;
};

export const AuthContext = React.createContext<AuthContextType>({
  token: null,
  user: null,
  login: async () => {},
  logout: () => {},
});
