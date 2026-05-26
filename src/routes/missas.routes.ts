import { PapelUsuario, TipoMissa } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as disponibilidadeService from "../services/disponibilidade.service.js";
import * as escalaService from "../services/escala.service.js";
import * as missaService from "../services/missa.service.js";
import {
  createEscalaSchema,
  escalaIdParamSchema,
  escalaQuerySchema,
  updateEscalaSchema,
} from "../validators/escala.validator.js";
import {
  createMissaSchema,
  missaFuncoesSchema,
  missaIdParamSchema,
  updateMissaSchema,
} from "../validators/missa.validator.js";

export const missasRouter = Router();

const staffOnly = requireRole(PapelUsuario.COORDENADOR, PapelUsuario.ADMIN);

missasRouter.use(authenticate);

/** GET /api/missas?mesAno=2025-07  ou  ?de=&ate=&tipo=&ativa= */
missasRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = z
      .object({
        mesAno: z.string().regex(/^\d{4}-\d{2}$/).optional(),
        de: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        ate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        tipo: z.nativeEnum(TipoMissa).optional(),
        ativa: z
          .enum(["true", "false"])
          .optional()
          .transform((v) => (v === undefined ? undefined : v === "true")),
      })
      .parse(req.query);

    const data = await missaService.listarMissas(query);
    res.json({ data });
  }),
);

missasRouter.post(
  "/",
  staffOnly,
  asyncHandler(async (req, res) => {
    const body = createMissaSchema.parse(req.body);
    const missa = await missaService.criarMissa(body);
    res.status(201).json({ data: missa });
  }),
);

/**
 * GET /api/missas/minhas
 * Resumo das próximas missas para o servidor autenticado.
 * Deve ficar ANTES das rotas /:missaId para não ser capturado como parâmetro.
 */
missasRouter.get(
  "/minhas",
  asyncHandler(async (req, res) => {
    const data = await escalaService.resumoProximasMissasServidor(req.user!.id);
    res.json({ data });
  }),
);

/** GET /api/missas/:missaId/servidores-disponiveis — antes de /:missaId genérico */
missasRouter.get(
  "/:missaId/servidores-disponiveis",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const { funcaoId } = z
      .object({ funcaoId: z.string().uuid().optional() })
      .parse(req.query);

    const data = funcaoId
      ? await disponibilidadeService.listarServidoresDisponiveisParaMissaFuncao(
          missaId,
          funcaoId,
        )
      : await disponibilidadeService.listarServidoresDisponiveisParaMissa(missaId);

    res.json({ data });
  }),
);

missasRouter.get(
  "/:missaId/escalas",
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const { funcaoId } = escalaQuerySchema.parse(req.query);
    const escalas = await escalaService.listarEscalasMissa(missaId, funcaoId);
    res.json({ data: escalas });
  }),
);

missasRouter.post(
  "/:missaId/escalas",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const body = createEscalaSchema.parse(req.body);
    const escala = await escalaService.atribuirEscala(missaId, body);
    res.status(201).json({ data: escala });
  }),
);

missasRouter.delete(
  "/:missaId/escalas/:escalaId",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId, escalaId } = z
      .object({ missaId: z.string().uuid(), escalaId: z.string().uuid() })
      .parse(req.params);
    const result = await escalaService.removerEscala(missaId, escalaId);
    res.json({ data: result });
  }),
);

/** PATCH /api/missas/:missaId/escalas/:escalaId — atualiza observação da escala */
missasRouter.patch(
  "/:missaId/escalas/:escalaId",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId, escalaId } = escalaIdParamSchema.parse(req.params);
    const { observacao } = updateEscalaSchema.parse(req.body);
    const escala = await escalaService.atualizarObservacaoEscala(missaId, escalaId, observacao);
    res.json({ data: escala });
  }),
);

/** GET /api/missas/:missaId/exportar — retorna texto formatado para compartilhar */
missasRouter.get(
  "/:missaId/exportar",
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const texto = await missaService.exportarEscala(missaId);
    res.json({ data: { texto } });
  }),
);

/** PATCH /api/missas/:missaId/publicar — coordenador fecha e publica a escala */
missasRouter.patch(
  "/:missaId/publicar",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const missa = await missaService.publicarMissa(missaId);
    res.json({ data: missa });
  }),
);

/** PATCH /api/missas/:missaId/despublicar — desfaz publicação (correções) */
missasRouter.patch(
  "/:missaId/despublicar",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const missa = await missaService.despublicarMissa(missaId);
    res.json({ data: missa });
  }),
);

missasRouter.get(
  "/:missaId",
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const missa = await missaService.obterMissa(missaId);
    res.json({ data: missa });
  }),
);

missasRouter.patch(
  "/:missaId",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const body = updateMissaSchema.parse(req.body);
    const missa = await missaService.atualizarMissa(missaId, body);
    res.json({ data: missa });
  }),
);

missasRouter.put(
  "/:missaId/funcoes",
  staffOnly,
  asyncHandler(async (req, res) => {
    const { missaId } = missaIdParamSchema.parse(req.params);
    const { funcoes } = missaFuncoesSchema.parse(req.body);
    const missa = await missaService.definirFuncoesMissa(missaId, funcoes);
    res.json({ data: missa });
  }),
);
