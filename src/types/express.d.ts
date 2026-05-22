import type { PapelUsuario } from "@prisma/client";

/** Usuário extraído do JWT (mesmos campos do payload). */
export interface AuthUser {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  papel: PapelUsuario;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
