import type { NextFunction, Request, Response } from "express";
import { PapelUsuario } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { verifyAccessToken } from "../lib/jwt.js";

/**
 * Exige header `Authorization: Bearer <token>`.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    next(new AppError("Token de autenticação ausente.", 401, "UNAUTHORIZED"));
    return;
  }

  const token = header.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new AppError("Token inválido ou expirado.", 401, "INVALID_TOKEN"));
  }
}

/**
 * Restringe rota aos papéis informados (use após `authenticate`).
 */
export function requireRole(...papeis: PapelUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Não autenticado.", 401, "UNAUTHORIZED"));
      return;
    }
    if (!papeis.includes(req.user.papel)) {
      next(new AppError("Sem permissão para este recurso.", 403, "FORBIDDEN"));
      return;
    }
    next();
  };
}

/** Servidor só acessa o próprio userId; coordenador/admin podem acessar qualquer um. */
export function assertSelfOrStaff(targetUserId: string, req: Request): void {
  if (!req.user) {
    throw new AppError("Não autenticado.", 401, "UNAUTHORIZED");
  }
  const isStaff =
    req.user.papel === PapelUsuario.COORDENADOR ||
    req.user.papel === PapelUsuario.ADMIN;
  if (!isStaff && req.user.id !== targetUserId) {
    throw new AppError("Acesso negado a dados de outro usuário.", 403, "FORBIDDEN");
  }
}
