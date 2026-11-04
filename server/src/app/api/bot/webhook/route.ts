import { after, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { registrarDiag } from "@/lib/diag";
import { registrarStatusBot } from "@/lib/metricas";
import { mensagensDoEvento, responder } from "@/lib/bot-ia";

/**
 * Webhook do bot do canal Tá Pago!, Phiz Business API.
 * O robô só envia depois de ter webhook cadastrado (set_webhooks) — mesmo
 * comportamento do canal do Report.
 *   GET  → verificação: hub.mode=subscribe, hub.verify_token, devolve hub.challenge em texto
 *   POST → robot:messages / robot:statuses; assinatura X-Phiz-Signature: sha256=HMAC(raw, segredo)
 * Precisa responder 2xx em até 6 s.
 */

export const maxDuration = 60;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const ok = q.get("hub.mode") === "subscribe" && !!q.get("hub.verify_token") && q.get("hub.verify_token") === process.env.TAPAGO_BOT_VERIFY;
  return ok ? new Response(q.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } }) : new Response("Proibido", { status: 403 });
}

function assinaturaOk(raw: string, h: string | null): boolean {
  const segredos = [process.env.TAPAGO_BOT_SECRET_MESSAGES, process.env.TAPAGO_BOT_SECRET_STATUSES].filter(Boolean) as string[];
  if (!segredos.length) return process.env.VERCEL_ENV !== "production"; // em produção, sem segredo não aceita nada
  const recebido = String(h || "").replace(/^sha256=/, "");
  return segredos.some(s => {
    const esperado = createHmac("sha256", s).update(raw).digest("hex");
    return esperado.length === recebido.length && timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
  });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!assinaturaOk(raw, req.headers.get("x-phiz-signature"))) return new Response("Assinatura inválida", { status: 401 });
  let ev: unknown = null;
  try { ev = JSON.parse(raw); } catch {}
  // Só o formato do evento (sem conteúdo nem telefone) vai pro diagnóstico.
  after(() => registrarStatusBot(ev));
  // Mensagem da pessoa pro bot: a IA responde (só sobre a conta dela). Roda depois do 200 (o PhizChat espera até 6 s).
  const recebidas = mensagensDoEvento(ev);
  if (recebidas.length) after(async () => { for (const m of recebidas.slice(0, 5)) { const r = await responder(m); console.log("[bot-ia]", r); } });
  after(() => registrarDiag({ em: new Date().toISOString(), bot: true, chaves: ev && typeof ev === "object" ? Object.keys(ev as object) : [], tamanho: raw.length }).catch(() => {}));
  return NextResponse.json({ ok: true });
}
