import { after, NextResponse } from "next/server";
import { eventoWebhook } from "@/lib/strava";

/** Verificação da assinatura do webhook (uma vez, quando criada). */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  if (q.get("hub.mode") === "subscribe" && q.get("hub.verify_token") === process.env.STRAVA_VERIFY_TOKEN)
    return NextResponse.json({ "hub.challenge": q.get("hub.challenge") });
  return new Response("Proibido", { status: 403 });
}

/** Evento: o Strava quer 200 em até 2 s — o trabalho vai pro after(). */
export async function POST(req: Request) {
  const ev = await req.json().catch(() => null);
  if (ev && typeof ev.owner_id === "number") after(() => eventoWebhook(ev).catch(e => console.error("[strava/webhook]", e)));
  return NextResponse.json({ ok: true });
}
