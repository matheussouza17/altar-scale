import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

function getSundays(year: number, month: number): number[] {
  const sundays: number[] = [];
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  for (let d = 1; d <= lastDay; d++) {
    if (new Date(Date.UTC(year, month - 1, d)).getUTCDay() === 0) sundays.push(d);
  }
  return sundays;
}

async function funcoesPadraoIds(): Promise<string[]> {
  const rows = await prisma.funcao.findMany({
    where: { padrao: true, ativo: true },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function generateSundaysForMonth(year: number, month: number) {
  const days = getSundays(year, month);
  if (days.length === 0) return { created: 0 };

  const records = days.flatMap((day) => {
    const data = new Date(Date.UTC(year, month - 1, day));
    return [
      { data, horario: "09:00", tipo: "DOMINICAL" as const },
      { data, horario: "18:00", tipo: "DOMINICAL" as const },
    ];
  });

  try {
    const res = await prisma.missa.createMany({ data: records, skipDuplicates: true });

    if (res.count > 0) {
      // Busca as missas recém-criadas para vincular funções padrão
      const inicio = new Date(Date.UTC(year, month - 1, 1));
      const fim = new Date(Date.UTC(year, month, 0));
      const missasCriadas = await prisma.missa.findMany({
        where: { data: { gte: inicio, lte: fim }, tipo: "DOMINICAL" },
        select: { id: true },
      });

      const funcaoIds = await funcoesPadraoIds();
      if (funcaoIds.length > 0) {
        const missaFuncoes = missasCriadas.flatMap((m) =>
          funcaoIds.map((funcaoId) => ({ missaId: m.id, funcaoId })),
        );
        await prisma.missaFuncao.createMany({ data: missaFuncoes, skipDuplicates: true });
      }
    }

    return { created: res.count };
  } catch (err) {
    console.error("Erro ao gerar missas dominicais:", err);
    throw err;
  }
}

export function startMonthlySundaysJob() {
  // Dispara às 00:05 do dia 1 de cada mês e gera o mês seguinte,
  // mantendo a invariante: mês atual + próximo mês sempre existem.
  cron.schedule("5 0 1 * *", async () => {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    const year = next.getUTCFullYear();
    const month = next.getUTCMonth() + 1;
    console.log(`[job] Gerando missas dominicais para ${year}-${String(month).padStart(2, "0")}`);
    try {
      const result = await generateSundaysForMonth(year, month);
      console.log(`[job] Missas criadas: ${result.created}`);
    } catch (err) {
      console.error("[job] Erro na geração mensal:", err);
    }
  });
}

export async function ensureCurrentAndNextMonth() {
  const now = new Date();
  const thisYear = now.getUTCFullYear();
  const thisMonth = now.getUTCMonth() + 1;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const nextYear = next.getUTCFullYear();
  const nextMonth = next.getUTCMonth() + 1;

  console.log(
    `[startup] Assegurando missas para ${thisYear}-${String(thisMonth).padStart(2, "0")} e ${nextYear}-${String(nextMonth).padStart(2, "0")}`,
  );
  await generateSundaysForMonth(thisYear, thisMonth);
  await generateSundaysForMonth(nextYear, nextMonth);
}

export default startMonthlySundaysJob;
