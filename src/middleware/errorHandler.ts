import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isAppError } from "../lib/errors.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Dados inválidos na requisição.",
      details: err.flatten(),
    });
    return;
  }

  if (isAppError(err)) {
    res.status(err.statusCode).json({
      error: err.code ?? "APP_ERROR",
      message: err.message,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Erro interno do servidor.",
  });
}
