import { after, NextResponse } from "next/server";
import { registrarAbertura } from "@/lib/metricas";
import { acertarNivelVisto, painel } from "@/lib/acoes";
import { grupoDe, meusGrupos } from "@/lib/grupos";
import { urlArte, urlCampeao, urlConquista, urlFoto, urlPodio, urlMapa, urlNivel } from "@/lib/mini-sessao";
import { concederConquistas } from "@/lib/conquistas-acoes";
import { lerCampanhas, temaDe, temaPraApp } from "@/lib/campanhas";
import { lerBanco as lerBancoAgora } from "@/lib/store";
import { absoluto } from "@/lib/midia";
import type { Periodo } from "@/lib/tipos";
import { exigir, falha, origem } from "../_util";
import { timelineGeral } from "@/lib/timeline";
import { lerBanco } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Tudo que a home do miniapp desenha, pronto (o .pxml não tem expressão).
 * ?grupo=<id> → ranking do grupo na métrica dele; sem grupo → ranking geral por pontos.
 * ?periodo=total|semana|mes|hoje (padrão total = ranking da vida toda).
 */
export async function GET(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  after(() => registrarAbertura(uid));
  after(() => acertarNivelVisto(uid));
  try {
    const q = new URL(req.url).searchParams;
    const grupoId = q.get("grupo") || "";
    const periodo = (["hoje", "semana", "mes", "total"].includes(q.get("periodo") || "") ? q.get("periodo") : "total") as Periodo;
    // Conquistas que a pessoa acabou de cumprir (ex.: Fundador) entram antes de montar o painel.
    await concederConquistas(uid).catch(e => console.error("[conquistas]", e));
    const g = await grupoDe(uid, grupoId);
    const p = await painel(uid, g ? g.membros : null, periodo, g ? g.metrica : "pontos");
    const o = origem(req);
    return NextResponse.json({
      ok: true, ...p,
      grupo: g ? grupoId : "", grupos: await meusGrupos(uid),
      ultimaFoto: p.ultimaFotoKey ? urlFoto(o, p.ultimaFotoKey) : "",
      stravaNovo: p.stravaNovo ? { ...p.stravaNovo, arte: urlArte(o, p.stravaNovo.id) } : null,
      // Arte do nível atual: fica no perfil e em Ajustes pra pessoa postar quando quiser.
      nivel: p.nivel ? { ...p.nivel, arte: urlNivel(o, uid, p.nivel.nivel) } : null,
      subiuNivel: p.subiuNivel ? { ...p.subiuNivel, arte: urlNivel(o, uid, p.subiuNivel.para) } : null,
      ...(await (async () => {
        const [{ conquistas, temas }, bc] = await Promise.all([lerCampanhas(), lerBancoAgora()]);
        const minhas = bc.usuarios[uid]?.conquistas || [];
        const nova = minhas.find(x => !x.vista && conquistas.some(c => c.id === x.id));
        const c = nova ? conquistas.find(x => x.id === nova.id)! : null;
        const t = temaPraApp(temaDe(temas, uid));
        return {
          // Tema do dia (card, faixa, enfeite nos avatares): imagens em URL completa.
          tema: t && { ...t, faixa: t.faixa && { ...t.faixa, imagem: absoluto(o, t.faixa.imagem) }, card: t.card && { ...t.card, imagem: absoluto(o, t.card.imagem) }, enfeite: t.enfeite && { ...t.enfeite, imagem: absoluto(o, t.enfeite.imagem) } },
          // Conquista ganha que a pessoa ainda não viu comemorar.
          conquistaNova: c ? { id: c.id, nome: c.nome, descricao: c.descricao, edicao: c.edicao || "", cor: c.cor, imagem: absoluto(o, c.imagem), arte: urlConquista(o, uid, c.id) } : null,
          conquistasN: minhas.length,
        };
      })()),
      vitoria: p.vitoria ? { ...p.vitoria, podio: urlPodio(o, p.vitoria.chave, uid, p.vitoria.semana), arte: urlCampeao(o, p.vitoria.id) } : null,
      treinaramHoje: p.treinaramHoje.map(({ fotoKey, ...t }) => ({ ...t, foto: fotoKey ? urlFoto(o, fotoKey) : "" })),
      timeline: timelineGeral(await lerBanco(), uid).map(({ fotoKey, ...t }) => ({ ...t, foto: fotoKey ? urlFoto(o, fotoKey) : "", card: t.card && { ...t.card, mapa: t.card.temMapa ? urlMapa(o, t.id) : "" } })),
      ranking: p.ranking.map(r => ({ ...r, foto: periodo === "hoje" && r.fotoKey ? urlFoto(o, r.fotoKey) : "" })),
    });
  } catch (e) {
    return falha(e);
  }
}
