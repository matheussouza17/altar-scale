import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { disponibilidadesRouter } from "./disponibilidades.routes.js";
import { funcoesRouter } from "./funcoes.routes.js";
import { healthRouter } from "./health.routes.js";
import { missasRouter } from "./missas.routes.js";
import { usersRouter } from "./users.routes.js";

/**
 * Montagem central das rotas da API (prefixo /api).
 *
 * | Módulo            | Prefixo              | Auth                          |
 * |-------------------|----------------------|-------------------------------|
 * | Health            | /health              | Público                       |
 * | Auth              | /auth                | login/register públicos       |
 * | Funções           | /funcoes             | JWT                           |
 * | Usuários          | /users               | JWT + Coordenador/Admin       |
 * | Disponibilidades  | /disponibilidades    | JWT (próprio ou staff)        |
 * | Missas + Escala   | /missas              | JWT (escrita: staff)          |
 */
export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/funcoes", funcoesRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/disponibilidades", disponibilidadesRouter);
apiRouter.use("/missas", missasRouter);
