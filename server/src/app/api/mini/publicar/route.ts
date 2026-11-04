import { NextResponse } from "next/server";
import { publicarCampeao, publicarTreino } from "@/lib/acoes";
import { exigir, falha } from "../_util";

export const maxDuration = 60;

/** Tela de parabéns: { treinoId, momentos, clipes }. Ver o limite em lib/acoes.ts. */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { treinoId?: string; vitoriaId?: string; momentos?: boolean; clipes?: boolean };
    if (b.vitoriaId) return NextResponse.json({ ok: true, ...(await publicarCampeao(uid, String(b.vitoriaId))) });
    const r = await publicarTreino(uid, String(b.treinoId || ""), { momentos: !!b.momentos, clipes: !!b.clipes });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return falha(e);
  }
}
