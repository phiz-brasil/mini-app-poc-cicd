import type { Banco, Treino } from "./store";
import { pontosDoDia } from "./ranking";
import { nomeDoTipo } from "./tipos";
import { cardDoTreino } from "./card-treino";

/**
 * Quem vê cada treino. Os pontos contam sempre (geral e grupos); "visivel" só decide em que timeline o
 * treino aparece. Sem "visivel" (treinos antigos) = aparece em tudo. A própria pessoa sempre vê.
 */
export function visivelNaGeral(b: Banco, t: Treino, quem: string): boolean {
  if (t.uid === quem) return true;
  const u = b.usuarios[t.uid];
  if (!u || !u.aparecer || !u.phizId) return false;
  return t.visivel ? t.visivel.geral !== false : true;
}

export function visivelNoGrupo(t: Treino, quem: string, grupoId: string): boolean {
  if (t.uid === quem || !t.visivel) return true;
  return t.visivel.grupos === "todos" || t.visivel.grupos.includes(grupoId);
}

/**
 * Um item de timeline. Treino sem foto (os do Strava) vira um card da categoria: corrida mostra
 * distância e ritmo, musculação mostra a duração etc. (decisão do Bayer: mostrar o treino pra todos).
 */
export function itemTimeline(b: Banco, t: Treino, quem: string) {
  const u = b.usuarios[t.uid];
  const eu = t.uid === quem;
  const strava = t.fonte === "strava" || !!t.externoId;
  const pontos = pontosDoDia(b.treinos.filter(x => x.uid === t.uid && x.dia === t.dia && !x.pendenteFoto));
  return {
    id: t.id, uid: t.uid, nome: u?.nome || "Alguém", avatar: u?.avatar, eu, dia: t.dia, criadoEm: t.criadoEm,
    strava,
    titulo: t.tituloProprio || t.titulo || "",
    tipo: nomeDoTipo(t.tipo),
    min: t.min,
    km: t.distanciaM ? Math.round(t.distanciaM / 100) / 10 : 0,
    pontos,
    card: !t.fotoKey ? cardDoTreino(t, pontos) : null,
    fotoKey: t.fotoKey,
    tp: b.tapagos.filter(x => x.para === t.uid && x.dia === t.dia).length,
    deiTp: b.tapagos.some(x => x.de === quem && x.para === t.uid && x.dia === t.dia),
  };
}

/** Timeline geral: quem treinou e deixou ir pra geral (mais recente primeiro). */
export function timelineGeral(b: Banco, quem: string, antes?: string, limite = 20) {
  return b.treinos
    .filter(t => !t.pendenteFoto && t.validacao?.status !== "recusada" && (!antes || t.criadoEm < antes) && visivelNaGeral(b, t, quem))
    .sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))
    .slice(0, limite)
    .map(t => itemTimeline(b, t, quem));
}
