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
  mesAno?: string;
  de?: string;
  ate?: string;
  tipo?: TipoMissa;
  ativa?: boolean;
}) {
  const where: Prisma.MissaWhereInput = {};

  if (params.tipo) where.tipo = params.tipo;
  if (params.ativa !== undefined) where.ativa = params.ativa;

  if (params.mesAno) {
    const [y, m] = params.mesAno.split("-").map(Number);
    where.data = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lte: new Date(Date.UTC(y, m, 0)),
    };
  } else if (params.de || params.ate) {
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

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export async function exportarEscala(missaId: string): Promise<string> {
  const missa = await prisma.missa.findUnique({
    where: { id: missaId },
    include: {
      funcoes: {
        include: { funcao: true },
        orderBy: { funcao: { ordem: "asc" } },
      },
      escalas: {
        include: {
          user: { select: { nome: true } },
          funcao: { select: { codigo: true, nome: true, ordem: true } },
        },
        orderBy: [{ funcao: { ordem: "asc" } }, { vaga: "asc" }],
      },
    },
  });

  if (!missa) throw new AppError("Missa não encontrada.", 404, "MISSA_NOT_FOUND");

  const data = missa.data;
  const diaSemana = DIAS_SEMANA[data.getUTCDay()];
  const dia = String(data.getUTCDate()).padStart(2, "0");
  const mes = MESES[data.getUTCMonth()];
  const ano = data.getUTCFullYear();
  const horario = missa.horario.replace(":", "h"); // "09:00" → "09h00"
  const titulo = missa.titulo ? ` — ${missa.titulo}` : "";

  const linhas: string[] = [
    `📋 *ESCALA — ${diaSemana}, ${dia} de ${mes} de ${ano} · ${horario}*${titulo}`,
    `${"─".repeat(45)}`,
  ];

  // Agrupa escalas por função (mantendo a ordem)
  const porFuncao = new Map<string, { nome: string; servidores: string[] }>();
  for (const mf of missa.funcoes) {
    porFuncao.set(mf.funcaoId, { nome: mf.funcao.nome, servidores: [] });
  }
  for (const e of missa.escalas) {
    const entry = porFuncao.get(e.funcaoId);
    if (entry) entry.servidores.push(e.user.nome);
  }

  for (const [, { nome, servidores }] of porFuncao) {
    const valor = servidores.length > 0 ? servidores.join(" / ") : "_em aberto_";
    linhas.push(`*${nome}:* ${valor}`);
  }

  if (missa.publicadaEm) {
    const pub = missa.publicadaEm;
    linhas.push("");
    linhas.push(
      `_Publicada em ${String(pub.getUTCDate()).padStart(2, "0")}/${String(pub.getUTCMonth() + 1).padStart(2, "0")}/${pub.getUTCFullYear()}_`,
    );
  }

  return linhas.join("\n");
}

export async function publicarMissa(missaId: string) {
  const missa = await prisma.missa.findUnique({ where: { id: missaId } });
  if (!missa) throw new AppError("Missa não encontrada.", 404, "MISSA_NOT_FOUND");
  if (missa.publicadaEm) throw new AppError("Escala já publicada.", 409, "ALREADY_PUBLISHED");

  return prisma.missa.update({
    where: { id: missaId },
    data: { publicadaEm: new Date() },
    include: {
      funcoes: { include: { funcao: true } },
      escalas: { include: { user: { select: { id: true, nome: true } }, funcao: true } },
    },
  });
}

export async function despublicarMissa(missaId: string) {
  const missa = await prisma.missa.findUnique({ where: { id: missaId } });
  if (!missa) throw new AppError("Missa não encontrada.", 404, "MISSA_NOT_FOUND");
  if (!missa.publicadaEm) throw new AppError("Escala não está publicada.", 409, "NOT_PUBLISHED");

  return prisma.missa.update({
    where: { id: missaId },
    data: { publicadaEm: null },
    include: {
      funcoes: { include: { funcao: true } },
      escalas: { include: { user: { select: { id: true, nome: true } }, funcao: true } },
    },
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
