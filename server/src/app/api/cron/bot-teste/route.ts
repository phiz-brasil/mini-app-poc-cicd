import { NextResponse } from "next/server";
import { simular } from "@/lib/bot-ia";

export const maxDuration = 60;

/** Teste da IA do bot sem mandar nada (protegido pelo CRON_SECRET): POST { uid, texto } → o que ela responderia. */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Proibido", { status: 403 });
  const b = (await req.json().catch(() => ({}))) as { uid?: string; texto?: string };
  const r = await simular(String(b.uid || ""), String(b.texto || ""));
  return r ? NextResponse.json({ ok: true, ...r }) : NextResponse.json({ ok: false }, { status: 404 });
}
