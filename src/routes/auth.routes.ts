import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { PapelUsuario } from "@prisma/client";
import * as authService from "../services/auth.service.js";
import * as userService from "../services/user.service.js";
import {
  alterarSenhaSchema,
  criarUsuarioSchema,
  definirSenhaSchema,
  loginSchema,
} from "../validators/auth.validator.js";
import { z } from "zod";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const token = await authService.login(body);
    res.json({ token });
  }),
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.obterPerfil(req.user!.id);
    res.json({ data: user });
  }),
);

/** Coordenador/Admin cria usuário — envia email com link para definir senha */
authRouter.post(
  "/usuarios",
  authenticate,
  requireRole(PapelUsuario.COORDENADOR, PapelUsuario.ADMIN),
  asyncHandler(async (req, res) => {
    const body = criarUsuarioSchema.parse(req.body);
    const result = await authService.criarUsuario(body, req.user!.papel);
    res.status(201).json({ data: result });
  }),
);

/** Solicita redefinição de senha — público, sempre retorna 200 (não revela se email existe) */
authRouter.post(
  "/solicitar-reset",
  asyncHandler(async (req, res) => {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await authService.solicitarResetSenha(email);
    res.json({ ok: true });
  }),
);

/** Usuário define/redefine a própria senha via token recebido por email */
authRouter.post(
  "/definir-senha",
  asyncHandler(async (req, res) => {
    const { token, novaSenha } = definirSenhaSchema.parse(req.body);
    const jwtToken = await authService.definirSenha(token, novaSenha);
    res.json({ token: jwtToken });
  }),
);

/** Usuário autenticado altera a própria senha */
authRouter.patch(
  "/senha",
  authenticate,
  asyncHandler(async (req, res) => {
    const body = alterarSenhaSchema.parse(req.body);
    const result = await userService.alterarSenha(req.user!.id, body);
    res.json({ data: result });
  }),
);
