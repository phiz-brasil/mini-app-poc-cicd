import { NextResponse } from "next/server";
import { resumoDeDomingo } from "@/lib/mensagens";

export const maxDuration = 300;

/** Vercel Cron, domingo 23:00 UTC = 20:00 em São Paulo (ver vercel.json). ?so=<uid> manda só pra uma pessoa (teste). */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Proibido", { status: 403 });
  const so = new URL(req.url).searchParams.get("so") || undefined;
  return NextResponse.json({ ok: true, ...(await resumoDeDomingo(so)) });
}
