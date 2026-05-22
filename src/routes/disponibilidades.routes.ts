import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { assertSelfOrStaff, authenticate } from "../middleware/auth.js";
import * as disponibilidadeService from "../services/disponibilidade.service.js";
import {
  disponibilidadeBulkSchema,
  disponibilidadeQuerySchema,
} from "../validators/disponibilidade.validator.js";

export const disponibilidadesRouter = Router();

disponibilidadesRouter.use(authenticate);

/**
 * GET /api/disponibilidades?mesAno=YYYY-MM&userId= (userId opcional para coord/admin)
 */
disponibilidadesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = disponibilidadeQuerySchema.parse(req.query);
    const userId = query.userId ?? req.user!.id;
    assertSelfOrStaff(userId, req);

    const data = await disponibilidadeService.listarDisponibilidadesUsuario(
      userId,
      query.mesAno,
    );
    res.json({ data });
  }),
);

/**
 * PUT /api/disponibilidades — salva disponibilidade.
 * Servidor salva a própria; coordenador/admin pode passar ?userId= para salvar por outro.
 */
disponibilidadesRouter.put(
  "/",
  asyncHandler(async (req, res) => {
    const { userId: targetId } = disponibilidadeQuerySchema.parse(req.query);
    const userId = targetId ?? req.user!.id;
    assertSelfOrStaff(userId, req);

    const body = disponibilidadeBulkSchema.parse(req.body);
    const result = await disponibilidadeService.salvarDisponibilidadesUsuario(userId, body);
    res.json({ data: result });
  }),
);
