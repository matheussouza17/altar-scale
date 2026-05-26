import { PapelUsuario } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as funcaoService from "../services/funcao.service.js";

export const funcoesRouter = Router();

funcoesRouter.use(authenticate);

const staffOnly = requireRole(PapelUsuario.COORDENADOR, PapelUsuario.ADMIN);

/** GET /api/funcoes?incluirInativas=true */
funcoesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { incluirInativas } = z
      .object({ incluirInativas: z.enum(["true", "false"]).optional().transform((v) => v === "true") })
      .parse(req.query);
    const funcoes = await funcaoService.listarFuncoes(!incluirInativas);
    res.json({ data: funcoes });
  }),
);

/** POST /api/funcoes */
funcoesRouter.post(
  "/",
  staffOnly,
  asyncHandler(async (req, res) => {
    const input = z
      .object({
        nome: z.string().min(2).max(80),
        descricao: z.string().max(200).nullable().optional(),
        padrao: z.boolean().optional(),
        ordem: z.number().int().min(0).optional(),
        quantidadePadrao: z.number().int().min(1).max(20).optional(),
      })
      .parse(req.body);
    const funcao = await funcaoService.criarFuncao(input);
    res.status(201).json({ data: funcao });
  }),
);

/** PATCH /api/funcoes/:funcaoId */
funcoesRouter.patch(
  "/:funcaoId",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { funcaoId } = z.object({ funcaoId: z.string().uuid() }).parse(req.params);
    const input = z
      .object({
        nome: z.string().min(2).max(80).optional(),
        descricao: z.string().max(200).nullable().optional(),
        padrao: z.boolean().optional(),
        ativo: z.boolean().optional(),
        ordem: z.number().int().min(0).optional(),
        quantidadePadrao: z.number().int().min(1).max(20).optional(),
      })
      .parse(req.body);
    const funcao = await funcaoService.editarFuncao(funcaoId, input);
    res.json({ data: funcao });
  }),
);

/** DELETE /api/funcoes/:funcaoId */
funcoesRouter.delete(
  "/:funcaoId",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { funcaoId } = z.object({ funcaoId: z.string().uuid() }).parse(req.params);
    await funcaoService.excluirFuncao(funcaoId);
    res.status(204).send();
  }),
);
