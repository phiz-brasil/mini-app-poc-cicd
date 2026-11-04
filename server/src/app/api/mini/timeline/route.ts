import { NextResponse } from "next/server";
import { lerBanco } from "@/lib/store";
import { timelineGeral } from "@/lib/timeline";
import { urlFoto, urlMapa } from "@/lib/mini-sessao";
import { exigir, falha, origem } from "../_util";

export const dynamic = "force-dynamic";

/** Timeline geral, paginada: GET ?antes=<criadoEm do último item>. */
export async function GET(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const antes = new URL(req.url).searchParams.get("antes") || undefined;
    const o = origem(req);
    const itens = timelineGeral(await lerBanco(), uid, antes).map(({ fotoKey, ...t }) => ({ ...t, foto: fotoKey ? urlFoto(o, fotoKey) : "", card: t.card && { ...t.card, mapa: t.card.temMapa ? urlMapa(o, t.id) : "" } }));
    return NextResponse.json({ ok: true, itens });
  } catch (e) {
    return falha(e);
  }
}
