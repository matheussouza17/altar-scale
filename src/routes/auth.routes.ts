import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { PapelUsuario } from "@prisma/client";
import * as authService from "../services/auth.service.js";
import {
  criarUsuarioSchema,
  loginSchema,
  registerSchema,
} from "../validators/auth.validator.js";

export const authRouter = Router();

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login com e-mail e senha
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, senha]
 *             properties:
 *               email: { type: string, format: email }
 *               senha: { type: string }
 *     responses:
 *       200:
 *         description: Token JWT (payload contém id, email, nome, telefone, papel)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 */
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const token = await authService.login(body);
    res.json({ token });
  }),
);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Cadastro de servidor (papel SERVIDOR)
 */
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const token = await authService.register(body);
    res.status(201).json({ token });
  }),
);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Perfil do usuário autenticado
 *     security:
 *       - bearerAuth: []
 */
authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await authService.obterPerfil(req.user!.id);
    res.json({ data: user });
  }),
);

/**
 * @openapi
 * /auth/usuarios:
 *   post:
 *     tags: [Auth]
 *     summary: Coordenador/Admin cria usuário com senha
 *     security:
 *       - bearerAuth: []
 */
authRouter.post(
  "/usuarios",
  authenticate,
  requireRole(PapelUsuario.COORDENADOR, PapelUsuario.ADMIN),
  asyncHandler(async (req, res) => {
    const body = criarUsuarioSchema.parse(req.body);
    const token = await authService.criarUsuario(body, req.user!.papel);
    res.status(201).json({ token });
  }),
);
