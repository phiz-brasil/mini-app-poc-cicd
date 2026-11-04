import { NextResponse } from "next/server";
import { lembrarCampanha, quaseNaFaixa, seteDiasSemAbrir, tresDiasSemTreino } from "@/lib/mensagens";

export const maxDuration = 300;

/**
 * Vercel Cron, passos agendados da régua (ver vercel.json, horários em UTC = SP + 3):
 *   ?passo=quase-faixa  12:00 UTC = 9h   · falta um treino pra próxima faixa
 *   ?passo=7-dias       15:00 UTC = 12h  · não abre o miniapp há 7 dias
 *   ?passo=3-dias       21:00 UTC = 18h  · 3 dias desde o último treino
 *   ?passo=campanha-lembrete 12:00 UTC = 9h · campanha-ultima 23:00 UTC = 20h (conquista de treino do dia)
 * `&so=<uid>` roda só pra uma pessoa; `&seco=1` não manda nada, só devolve quantos e os textos (teste).
 */
const PASSOS = { "quase-faixa": quaseNaFaixa, "3-dias": tresDiasSemTreino, "7-dias": seteDiasSemAbrir,
  "campanha-lembrete": (so?: string, seco?: boolean) => lembrarCampanha("lembrete", so, seco), "campanha-ultima": (so?: string, seco?: boolean) => lembrarCampanha("ultima", so, seco) };

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Proibido", { status: 403 });
  const q = new URL(req.url).searchParams;
  const nome = q.get("passo") || "";
  // hasOwn e não indexação direta: "__proto__" resolve no prototype e é truthy
  // — o dispatch dinâmico só vale para chaves próprias de PASSOS (CodeQL).
  if (!Object.hasOwn(PASSOS, nome)) return NextResponse.json({ ok: false, erro: "Passo desconhecido." }, { status: 400 });
  const passo = nome as keyof typeof PASSOS;
  return NextResponse.json({ ok: true, passo, ...(await PASSOS[passo](q.get("so") || undefined, q.get("seco") === "1")) });
}
