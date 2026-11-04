import { NextResponse } from "next/server";
import { listaMoments } from "@/lib/moments";
import { lerBanco } from "@/lib/store";
import { urlArte, urlCampeao, urlPodio } from "@/lib/mini-sessao";
import { exigir, falha, origem } from "../_util";

export const dynamic = "force-dynamic";

/** Página Moments: artes prontas dos treinos, pódios da semana e campeões. */
export async function GET(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const l = listaMoments(await lerBanco(), uid);
    const o = origem(req);
    return NextResponse.json({
      ok: true,
      treinos: l.treinos.map(t => ({ ...t, arte: urlArte(o, t.id) })),
      podios: l.podios.map(p => ({ ...p, arte: urlPodio(o, p.chave, uid) })),
      campeoes: l.campeoes.map(c => ({ ...c, arte: urlCampeao(o, c.id) })),
    });
  } catch (e) {
    return falha(e);
  }
}
