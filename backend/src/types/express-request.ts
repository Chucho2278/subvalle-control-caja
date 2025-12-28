import { Request } from "express";
import { AuthUser } from "./auth";

export interface AuthRequest extends Request {
  user?: AuthUser;
}
