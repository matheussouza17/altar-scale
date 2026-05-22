import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate } from "../middleware/auth.js";
import * as funcaoService from "../services/funcao.service.js";

export const funcoesRouter = Router();

funcoesRouter.use(authenticate);

/** GET /api/funcoes — catálogo de funções litúrgicas */
funcoesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const funcoes = await funcaoService.listarFuncoes();
    res.json({ data: funcoes });
  }),
);
