import { Prisma, TipoMissa } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { parseDataIso } from "./disponibilidade.service.js";
import type { CreateMissaInput, UpdateMissaInput } from "../validators/missa.validator.js";

async function funcoesPadraoIds() {
  const rows = await prisma.funcao.findMany({
    where: { padrao: true, ativo: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

async function sincronizarFuncoesMissa(missaId: string, funcaoIds: string[]) {
  const existentes = await prisma.missaFuncao.findMany({
    where: { missaId },
    select: { funcaoId: true },
  });
  const setAtual = new Set(existentes.map((e) => e.funcaoId));
  const setNovo = new Set(funcaoIds);

  const remover = [...setAtual].filter((id) => !setNovo.has(id));
  const adicionar = [...setNovo].filter((id) => !setAtual.has(id));

  await prisma.$transaction([
    ...remover.map((funcaoId) =>
      prisma.missaFuncao.delete({ where: { missaId_funcaoId: { missaId, funcaoId } } }),
    ),
    ...adicionar.map((funcaoId) =>
      prisma.missaFuncao.create({ data: { missaId, funcaoId } }),
    ),
  ]);
}

export async function criarMissa(input: CreateMissaInput) {
  if (input.tipo === TipoMissa.ESPECIAL && !input.titulo) {
    throw new AppError("Missas especiais exigem título.", 400, "TITULO_REQUIRED");
  }

  const funcaoIds = input.funcaoIds ?? (await funcoesPadraoIds());

  const missa = await prisma.missa.create({
    data: {
      titulo: input.titulo,
      data: parseDataIso(input.data),
      horario: input.horario,
      tipo: input.tipo,
      observacoes: input.observacoes,
      funcoes: {
        create: funcaoIds.map((funcaoId) => ({ funcaoId })),
      },
    },
    include: {
      funcoes: { include: { funcao: true } },
    },
  });

  return missa;
}

export async function atualizarMissa(missaId: string, input: UpdateMissaInput) {
  const existente = await prisma.missa.findUnique({ where: { id: missaId } });
  if (!existente) throw new AppError("Missa não encontrada.", 404, "MISSA_NOT_FOUND");

  const missa = await prisma.missa.update({
    where: { id: missaId },
    data: {
      titulo: input.titulo,
      data: input.data ? parseDataIso(input.data) : undefined,
      horario: input.horario,
      tipo: input.tipo,
      observacoes: input.observacoes,
      ativa: input.ativa,
    },
    include: {
      funcoes: { include: { funcao: true } },
      escalas: { include: { user: { select: { id: true, nome: true } }, funcao: true } },
    },
  });

  if (input.funcaoIds) {
    await sincronizarFuncoesMissa(missaId, input.funcaoIds);
    return prisma.missa.findUnique({
      where: { id: missaId },
      include: {
        funcoes: { include: { funcao: true } },
        escalas: { include: { user: { select: { id: true, nome: true } }, funcao: true } },
      },
    });
  }

  return missa;
}

export async function obterMissa(missaId: string) {
  const missa = await prisma.missa.findUnique({
    where: { id: missaId },
    include: {
      funcoes: { include: { funcao: true }, orderBy: { funcao: { ordem: "asc" } } },
      escalas: {
        include: {
          user: { select: { id: true, nome: true, email: true } },
          funcao: true,
        },
        orderBy: [{ funcao: { ordem: "asc" } }, { vaga: "asc" }],
      },
    },
  });

  if (!missa) throw new AppError("Missa não encontrada.", 404, "MISSA_NOT_FOUND");
  return missa;
}

export async function listarMissas(params: {
  de?: string;
  ate?: string;
  tipo?: TipoMissa;
  ativa?: boolean;
}) {
  const where: Prisma.MissaWhereInput = {};

  if (params.tipo) where.tipo = params.tipo;
  if (params.ativa !== undefined) where.ativa = params.ativa;
  if (params.de || params.ate) {
    where.data = {};
    if (params.de) where.data.gte = parseDataIso(params.de);
    if (params.ate) where.data.lte = parseDataIso(params.ate);
  }

  return prisma.missa.findMany({
    where,
    include: {
      funcoes: { include: { funcao: { select: { codigo: true, nome: true } } } },
      _count: { select: { escalas: true } },
    },
    orderBy: [{ data: "asc" }, { horario: "asc" }],
  });
}

export async function definirFuncoesMissa(
  missaId: string,
  funcoes: { funcaoId: string; quantidade?: number; obrigatoria?: boolean }[],
) {
  const missa = await prisma.missa.findUnique({ where: { id: missaId } });
  if (!missa) throw new AppError("Missa não encontrada.", 404, "MISSA_NOT_FOUND");

  await prisma.$transaction(
    funcoes.map((f) =>
      prisma.missaFuncao.upsert({
        where: { missaId_funcaoId: { missaId, funcaoId: f.funcaoId } },
        create: {
          missaId,
          funcaoId: f.funcaoId,
          quantidade: f.quantidade ?? 1,
          obrigatoria: f.obrigatoria ?? true,
        },
        update: {
          quantidade: f.quantidade,
          obrigatoria: f.obrigatoria,
        },
      }),
    ),
  );

  return obterMissa(missaId);
}
