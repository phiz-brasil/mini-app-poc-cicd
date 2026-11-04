import { NextResponse } from "next/server";
import { paginaDoGrupo } from "@/lib/grupos";
import { urlFoto, urlMapa } from "@/lib/mini-sessao";
import type { Periodo } from "@/lib/tipos";
import { exigir, falha, origem } from "../_util";

export const dynamic = "force-dynamic";

/** Página do grupo: GET ?id=<grupo>&periodo=total|semana|mes|hoje (padrão total = geral do desafio). */
export async function GET(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const q = new URL(req.url).searchParams;
    const periodo = (["hoje", "semana", "mes", "total"].includes(q.get("periodo") || "") ? q.get("periodo") : "total") as Periodo;
    const p = await paginaDoGrupo(uid, q.get("id") || "", periodo);
    const o = origem(req);
    return NextResponse.json({
      ok: true, ...p,
      ranking: p.ranking.map(({ fotoKey, ...r }) => ({ ...r, foto: fotoKey && periodo === "hoje" ? urlFoto(o, fotoKey) : "" })),
      feed: p.feed.map(({ fotoKey, ...t }) => ({ ...t, foto: fotoKey ? urlFoto(o, fotoKey) : "", card: t.card && { ...t.card, mapa: t.card.temMapa ? urlMapa(o, t.id) : "" } })),
    });
  } catch (e) {
    return falha(e);
  }
}
