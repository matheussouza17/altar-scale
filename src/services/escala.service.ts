import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { listarServidoresDisponiveisParaMissa } from "./disponibilidade.service.js";

async function proximaVagaDisponivel(
  missaId: string,
  funcaoId: string,
  quantidade: number,
): Promise<number> {
  const ocupadas = await prisma.escala.findMany({
    where: { missaId, funcaoId },
    select: { vaga: true },
  });
  const set = new Set(ocupadas.map((e) => e.vaga));
  for (let v = 1; v <= quantidade; v++) {
    if (!set.has(v)) return v;
  }
  throw new AppError(
    `Todas as ${quantidade} vaga(s) desta função já estão preenchidas.`,
    409,
    "VAGAS_ESGOTADAS",
  );
}

/**
 * Atribui um servidor a uma função na missa.
 * Se o servidor já estava atribuído à mesma função, atualiza a observação.
 * A vaga é calculada automaticamente (menor slot disponível).
 */
export async function atribuirEscala(
  missaId: string,
  data: { funcaoId: string; userId: string; observacao?: string },
) {
  const missaFuncao = await prisma.missaFuncao.findUnique({
    where: { missaId_funcaoId: { missaId, funcaoId: data.funcaoId } },
  });
  if (!missaFuncao) {
    throw new AppError("Função não habilitada nesta missa.", 400, "FUNCAO_NOT_ENABLED");
  }

  const disponiveis = await listarServidoresDisponiveisParaMissa(missaId);
  const servidorOk = disponiveis.servidores.some((s) => s.id === data.userId);
  if (!servidorOk) {
    throw new AppError(
      "Servidor não está disponível para esta data e horário.",
      400,
      "SERVIDOR_INDISPONIVEL",
    );
  }

  const vaga = await proximaVagaDisponivel(missaId, data.funcaoId, missaFuncao.quantidade);

  return prisma.escala.upsert({
    where: {
      missaId_funcaoId_userId: {
        missaId,
        funcaoId: data.funcaoId,
        userId: data.userId,
      },
    },
    create: {
      missaId,
      funcaoId: data.funcaoId,
      userId: data.userId,
      vaga,
      observacao: data.observacao ?? null,
    },
    update: {
      observacao: data.observacao ?? null,
    },
    include: {
      user: { select: { id: true, nome: true } },
      funcao: { select: { codigo: true, nome: true } },
    },
  });
}

/** Atualiza apenas a observação de uma escala já existente. */
export async function atualizarObservacaoEscala(
  missaId: string,
  escalaId: string,
  observacao: string | null,
) {
  const escala = await prisma.escala.findFirst({ where: { id: escalaId, missaId } });
  if (!escala) throw new AppError("Registro de escala não encontrado.", 404, "ESCALA_NOT_FOUND");

  return prisma.escala.update({
    where: { id: escalaId },
    data: { observacao },
    include: {
      user: { select: { id: true, nome: true } },
      funcao: { select: { codigo: true, nome: true } },
    },
  });
}

export async function removerEscala(missaId: string, escalaId: string) {
  const escala = await prisma.escala.findFirst({ where: { id: escalaId, missaId } });
  if (!escala) throw new AppError("Registro de escala não encontrado.", 404, "ESCALA_NOT_FOUND");

  await prisma.escala.delete({ where: { id: escalaId } });
  return { removido: true };
}

export async function listarEscalasMissa(missaId: string, funcaoId?: string) {
  return prisma.escala.findMany({
    where: { missaId, ...(funcaoId ? { funcaoId } : {}) },
    include: {
      user: { select: { id: true, nome: true, email: true } },
      funcao: true,
    },
    orderBy: [{ funcao: { ordem: "asc" } }, { vaga: "asc" }],
  });
}

/**
 * Resumo das próximas missas para o painel do servidor.
 * Retorna todas as missas futuras (a partir de hoje) onde o servidor está escalado,
 * com as funções e observações agrupadas por celebração.
 */
export async function resumoProximasMissasServidor(userId: string) {
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);

  const escalas = await prisma.escala.findMany({
    where: {
      userId,
      missa: { data: { gte: hoje }, ativa: true },
    },
    include: {
      missa: {
        select: {
          id: true,
          data: true,
          horario: true,
          titulo: true,
          tipo: true,
          publicadaEm: true,
        },
      },
      funcao: { select: { codigo: true, nome: true, ordem: true } },
    },
    orderBy: [
      { missa: { data: "asc" } },
      { missa: { horario: "asc" } },
      { funcao: { ordem: "asc" } },
    ],
  });

  // Agrupa por missa mantendo a ordem cronológica
  const porMissa = new Map<
    string,
    {
      missaId: string;
      data: Date;
      horario: string;
      titulo: string | null;
      tipo: string;
      publicada: boolean;
      funcoes: Array<{
        escalaId: string;
        codigo: string;
        nome: string;
        vaga: number;
        observacao: string | null;
      }>;
    }
  >();

  for (const escala of escalas) {
    if (!porMissa.has(escala.missaId)) {
      porMissa.set(escala.missaId, {
        missaId: escala.missaId,
        data: escala.missa.data,
        horario: escala.missa.horario,
        titulo: escala.missa.titulo,
        tipo: escala.missa.tipo,
        publicada: !!escala.missa.publicadaEm,
        funcoes: [],
      });
    }
    porMissa.get(escala.missaId)!.funcoes.push({
      escalaId: escala.id,
      codigo: escala.funcao.codigo,
      nome: escala.funcao.nome,
      vaga: escala.vaga,
      observacao: escala.observacao,
    });
  }

  return { proximas: [...porMissa.values()] };
}
