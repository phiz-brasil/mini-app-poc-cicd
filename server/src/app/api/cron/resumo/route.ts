import { NextResponse } from "next/server";
import { resumoDas17h } from "@/lib/mensagens";
import { limparStravaAntigo } from "@/lib/strava";

export const maxDuration = 300;

/** Vercel Cron, todo dia 20:00 UTC = 17:00 em São Paulo (ver vercel.json). */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Proibido", { status: 403 });
  const limpos = await limparStravaAntigo().catch(e => { console.error("[limpar strava]", e); return -1; });
  return NextResponse.json({ ok: true, stravaLimpos: limpos, ...(await resumoDas17h()) });
}
