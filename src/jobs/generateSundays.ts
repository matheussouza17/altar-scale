import cron from "node-cron";
import { prisma } from "../lib/prisma.js";

function getSundays(year: number, month: number) {
  const sundays: number[] = [];
  // month: 1-12
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  for (let d = 1; d <= lastDay; d++) {
    const dt = new Date(year, month - 1, d);
    if (dt.getDay() === 0) sundays.push(d);
  }
  return sundays;
}

export async function generateSundaysForMonth(year: number, month: number) {
  const days = getSundays(year, month);
  if (days.length === 0) return { created: 0 };

  const records = [] as { data: Date; horario: "H09" | "H18"; tipo?: string }[];
  for (const day of days) {
    // `data` stored as Date (DB column is DATE)
    const dateOnly = new Date(year, month - 1, day);
    records.push({ data: dateOnly, horario: "H09", tipo: "DOMINICAL" });
    records.push({ data: dateOnly, horario: "H18", tipo: "DOMINICAL" });
  }

  try {
    const res = await prisma.missa.createMany({ data: records, skipDuplicates: true });
    return { created: res.count };
  } catch (err) {
    console.error("Erro ao gerar missas dominicais:", err);
    throw err;
  }
}

export function startMonthlySundaysJob() {
  // Runs at 00:05 on day 1 of each month
  cron.schedule("5 0 1 * *", async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12
    console.log(`Gerando missas dominicais para ${year}-${String(month).padStart(2, "0")}`);
    try {
      const result = await generateSundaysForMonth(year, month);
      console.log(`Missas criadas/skipped: ${result.created}`);
    } catch (err) {
      console.error("Erro no job de geração mensal:", err);
    }
  });
}

export async function ensureCurrentAndNextMonth() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextYear = next.getFullYear();
  const nextMonth = next.getMonth() + 1;

  console.log(`Assegurando missas para ${thisYear}-${String(thisMonth).padStart(2, "0")} e ${nextYear}-${String(nextMonth).padStart(2, "0")}`);
  await generateSundaysForMonth(thisYear, thisMonth);
  await generateSundaysForMonth(nextYear, nextMonth);
}

export default startMonthlySundaysJob;
