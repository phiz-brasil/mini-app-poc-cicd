import { NextResponse } from "next/server";
import { postarNoMoments } from "@/lib/moments";
import { exigir, falha } from "../../_util";

export const maxDuration = 60;

/** { tipo: "frame"|"treino"|"podio"|"campeao", id?, frame?, chave? } → posta nos Moments pela conta Tá Pago!. */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { tipo?: string; id?: string; frame?: string; chave?: string };
    return NextResponse.json({ ok: true, ...(await postarNoMoments(uid, { tipo: String(b.tipo || ""), id: b.id, frame: b.frame, chave: b.chave })) });
  } catch (e) {
    return falha(e);
  }
}
