import { Router } from "express";
import { PapelUsuario } from "@prisma/client";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as userService from "../services/user.service.js";
import {
  atualizarStatusUserSchema,
  listarUsersQuerySchema,
  userIdParamSchema,
} from "../validators/user.validator.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireRole(PapelUsuario.COORDENADOR, PapelUsuario.ADMIN));

/**
 * GET /api/users?incluirInativos=true
 * Lista servidores e coordenadores (por padrão só ativos).
 */
usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { incluirInativos } = listarUsersQuerySchema.parse(req.query);
    const users = await userService.listarUsuarios(incluirInativos);
    res.json({ data: users });
  }),
);

/** GET /api/users/:userId */
usersRouter.get(
  "/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const user = await userService.obterUsuario(userId);
    res.json({ data: user });
  }),
);

/**
 * PATCH /api/users/:userId
 * Desativa ou reativa usuário (`{ "ativo": false }`).
 */
usersRouter.patch(
  "/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const { ativo } = atualizarStatusUserSchema.parse(req.body);
    const user = await userService.atualizarStatusUsuario(
      userId,
      ativo,
      req.user!,
    );
    res.json({ data: user });
  }),
);
