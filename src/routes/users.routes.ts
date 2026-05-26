import { Router } from "express";
import { PapelUsuario } from "@prisma/client";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as userService from "../services/user.service.js";
import {
  atualizarStatusUserSchema,
  editarUsuarioSchema,
  listarUsersQuerySchema,
  resetarSenhaSchema,
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

/** PUT /api/users/:userId — edita nome e/ou telefone */
usersRouter.put(
  "/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const input = editarUsuarioSchema.parse(req.body);
    const user = await userService.editarUsuario(userId, input, req.user!);
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

/**
 * PATCH /api/users/:userId/reset-senha
 * Coordenador/Admin define uma nova senha para o servidor.
 * O servidor usará PATCH /api/auth/senha para trocá-la depois.
 */
usersRouter.patch(
  "/:userId/reset-senha",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const { novaSenha } = resetarSenhaSchema.parse(req.body);
    const result = await userService.resetarSenha(userId, novaSenha, req.user!);
    res.json({ data: result });
  }),
);

/** DELETE /api/users/:userId — remove permanentemente se não tiver escalas */
usersRouter.delete(
  "/:userId",
  asyncHandler(async (req, res) => {
    const { userId } = userIdParamSchema.parse(req.params);
    const result = await userService.excluirUsuario(userId, req.user!);
    res.json({ data: result });
  }),
);
