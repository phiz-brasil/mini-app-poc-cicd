import { NextResponse } from "next/server";
import { apagarTreino, minhaPagina } from "@/lib/acoes";
import { urlConquista, urlFoto, urlNivel } from "@/lib/mini-sessao";
import { lerCampanhas, vitrine } from "@/lib/campanhas";
import { lerBanco } from "@/lib/store";
import { absoluto } from "@/lib/midia";
import { exigir, falha, origem } from "../_util";

export const dynamic = "force-dynamic";

/** GET: a página "Eu" (números + treinos). */
export async function GET(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const alvo = new URL(req.url).searchParams.get("uid") || uid;
    const p = await minhaPagina(alvo, uid);
    const o = origem(req);
    // Meu nível vem com a arte, pro botão de compartilhar no card.
    const nivel = "nivel" in p && p.nivel ? { ...p.nivel, arte: urlNivel(o, uid, p.nivel.nivel) } : undefined;
    // Conquistas: as ganhas (no meu perfil e no dos outros) e, só no meu, as bloqueadas que ainda dá pra ganhar.
    const [{ conquistas }, b] = await Promise.all([lerCampanhas(), lerBanco()]);
    const dono = b.usuarios[alvo];
    const v = dono ? vitrine(conquistas, dono, alvo !== uid) : { ganhas: [], bloqueadas: [] };
    const cq = {
      ganhas: v.ganhas.map(c => ({ ...c, imagem: absoluto(o, c.imagem), arte: alvo === uid ? urlConquista(o, uid, c.id) : "" })),
      bloqueadas: v.bloqueadas.map(c => ({ ...c, imagem: absoluto(o, c.imagem) })),
    };
    return NextResponse.json({ ok: true, ...p, ...(nivel ? { nivel } : {}), conquistas: cq, treinos: p.treinos.map(({ fotoKey, fotoExterna, ...t }) => ({ ...t, foto: fotoKey ? urlFoto(o, fotoKey) : fotoExterna || "" })) });
  } catch (e) {
    return falha(e);
  }
}

/** POST { acao: "apagar", id }: apaga um treino meu. */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { acao?: string; id?: string };
    if (b.acao !== "apagar") return NextResponse.json({ ok: false, erro: "Ação inválida." }, { status: 400 });
    await apagarTreino(uid, String(b.id || ""));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return falha(e);
  }
}
