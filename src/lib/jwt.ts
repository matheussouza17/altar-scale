import jwt from "jsonwebtoken";
import type { PapelUsuario } from "@prisma/client";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/express.js";

/** Claims do JWT — decodifique o token no cliente para obter estes campos. */
export interface JwtPayload {
  sub: string;
  email: string;
  nome: string;
  telefone: string | null;
  papel: PapelUsuario;
}

export function signAccessToken(user: {
  id: string;
  email: string;
  nome: string;
  telefone: string | null;
  papel: PapelUsuario;
}): string {
  const payload: JwtPayload = {
    sub: user.id,
    email: user.email,
    nome: user.nome,
    telefone: user.telefone,
    papel: user.papel,
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  return {
    id: decoded.sub,
    email: decoded.email,
    nome: decoded.nome,
    telefone: decoded.telefone,
    papel: decoded.papel,
  };
}
