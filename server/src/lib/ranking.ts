import type { Banco, Treino, Usuario } from "./store";
import { KM_MANUAL_MAX_DIA, MANUAL_MAX_DIA, nomeDoTipo, PONTOS, segundaDe, type Metrica, type Periodo } from "./tipos";

export type LinhaRanking = {
  uid: string;
  nome: string;
  avatar?: string;
  min: number;
  treinos: number;
  fez: string;
  fotoKey?: string;
  tpRecebidos: number;
  deiTp: boolean;
  dias: number;
};

/** Minutos que contam: treino à mão soma até 90 min por pessoa por dia. */
function minutosDoDia(ts: Treino[]): number {
  const manual = ts.filter(t => t.fonte === "manual").reduce((a, t) => a + t.min, 0);
  // Treino que veio de relógio/app (Saúde, Strava, Garmin) conta inteiro.
  const saude = ts.filter(t => t.fonte !== "manual").reduce((a, t) => a + t.min, 0);
  return Math.min(MANUAL_MAX_DIA, manual) + saude;
}

/**
 * O que a pessoa fez hoje, em texto. Regra do Strava (API Agreement): a atividade do Strava só aparece
 * em detalhe pro próprio atleta. Pros outros, treino do Strava vira só "Treinou" (os totais continuam).
 */
function fezTexto(ts: Treino[], eu: boolean): string {
  const vale = ts.filter(t => !t.pendenteFoto);
  const doApp = [...new Set(vale.filter(t => eu || t.fonte !== "strava").map(t => nomeDoTipo(t.tipo)))];
  if (!eu && !doApp.length && vale.length) return "Treinou";
  return doApp.join(" + ") + (eu && vale.some(t => t.fonte === "strava") ? " · Strava" : "");
}

/** Filtro opcional: só os membros de um grupo. */
let filtroMembros: Set<string> | null = null;
export function comGrupo<T>(membros: string[] | null, fn: () => T): T {
  filtroMembros = membros ? new Set(membros) : null;
  try { return fn(); } finally { filtroMembros = null; }
}

function visiveis(b: Banco, eu: string): Usuario[] {
  if (filtroMembros) return Object.values(b.usuarios).filter(u => filtroMembros!.has(u.id));
  // Só conta do PhizChat de verdade (com PhizID) aparece pros outros: o simulador
  // da IDE e testes não poluem o ranking. A própria pessoa sempre se vê.
  return Object.values(b.usuarios).filter(u => u.id === eu || (u.aparecer && !!u.phizId));
}

export function rankingDoDia(b: Banco, dia: string, eu: string): LinhaRanking[] {
  return visiveis(b, eu)
    .map(u => {
      const ts = b.treinos.filter(t => t.uid === u.id && t.dia === dia && !t.pendenteFoto);
      const ultimo = [...ts].sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))[0];
      return {
        uid: u.id, nome: u.nome, avatar: u.avatar, min: minutosDoDia(ts), treinos: ts.length,
        fez: fezTexto(ts, u.id === eu),
        fotoKey: ultimo?.fotoKey,
        tpRecebidos: b.tapagos.filter(x => x.para === u.id && x.dia === dia).length,
        deiTp: b.tapagos.some(x => x.de === eu && x.para === u.id && x.dia === dia),
        dias: ts.length ? 1 : 0,
      };
    })
    .sort((a, c) => c.min - a.min || a.nome.localeCompare(c.nome));
}

export function rankingDaSemana(b: Banco, dia: string, eu: string): LinhaRanking[] {
  const ini = segundaDe(dia);
  return visiveis(b, eu)
    .map(u => {
      const ts = b.treinos.filter(t => t.uid === u.id && t.dia >= ini && t.dia <= dia && !t.pendenteFoto);
      const porDia = new Map<string, Treino[]>();
      ts.forEach(t => porDia.set(t.dia, [...(porDia.get(t.dia) || []), t]));
      const min = [...porDia.values()].reduce((a, l) => a + minutosDoDia(l), 0);
      return {
        uid: u.id, nome: u.nome, avatar: u.avatar, min, treinos: ts.length, fez: "", tpRecebidos: 0, deiTp: false, dias: porDia.size,
      };
    })
    .sort((a, c) => c.min - a.min || c.dias - a.dias || a.nome.localeCompare(c.nome));
}

export function sequencia(b: Banco, uid: string, dia: string): number {
  const dias = new Set(b.treinos.filter(t => t.uid === uid && !t.pendenteFoto).map(t => t.dia));
  let n = 0;
  const d = new Date(dia + "T12:00:00Z");
  // Hoje sem treino ainda não quebra a sequência.
  if (!dias.has(dia)) d.setUTCDate(d.getUTCDate() - 1);
  while (dias.has(d.toISOString().slice(0, 10))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

/* ── Ranking por métrica (grupos) e por pontos (geral) ────────────────── */

/** Km que contam no dia: à mão até 20 km; de relógio/app, inteiro. */
function kmDoDia(ts: Treino[]): number {
  const km = (l: Treino[]) => l.reduce((a, t) => a + (t.distanciaM || 0), 0) / 1000;
  return Math.min(KM_MANUAL_MAX_DIA, km(ts.filter(t => t.fonte === "manual"))) + km(ts.filter(t => t.fonte !== "manual"));
}

export function pontosDoDia(ts: Treino[]): number {
  if (!ts.length) return 0;
  return PONTOS.dia + Math.floor(Math.min(PONTOS.minMax, minutosDoDia(ts)) / PONTOS.cadaMin) + Math.min(PONTOS.kmMax, Math.floor(kmDoDia(ts)));
}

export function inicioDo(periodo: Periodo, dia: string): string {
  if (periodo === "total") return "0000-01-01";
  if (periodo === "hoje") return dia;
  if (periodo === "semana") return segundaDe(dia);
  return dia.slice(0, 8) + "01";
}

/** Selo verificado: do perfil do PhizChat, ou da lista do beta (TAPAGO_VERIFICADOS = "phizId;phizId"). */
export function ehVerificado(u: Usuario): boolean {
  if (u.verificado) return true;
  const lista = (process.env.TAPAGO_VERIFICADOS || "").split(/[;,\s]+/).filter(Boolean);
  return !!u.phizId && lista.includes(u.phizId);
}

export type LinhaMetrica = {
  uid: string; nome: string; avatar?: string; verificado: boolean; cutuquei: boolean; treinouHoje: boolean; trofeus: number;
  valor: number; min: number; km: number; dias: number; pontos: number; treinos: number;
  fez: string; fotoKey?: string; tpRecebidos: number; deiTp: boolean;
};

/**
 * Ranking de um período. `membros` = grupo (todo mundo do grupo aparece);
 * sem grupo = ranking geral: só quem deixou aberto (aparecer) e tem PhizID. Quem fechou some
 * pra todo mundo, inclusive pra si mesmo (a home mostra o aviso "fora do ranking geral").
 */
export function rankingPor(b: Banco, eu: string, dia: string, periodo: Periodo, metrica: Metrica, membros: string[] | null, limites?: { inicio?: string; fim?: string }): LinhaMetrica[] {
  // Desafio com data: o período nunca passa do início/fim do grupo.
  let ini = inicioDo(periodo, dia);
  if (limites?.inicio && limites.inicio > ini) ini = limites.inicio;
  if (limites?.fim && limites.fim < dia) dia = limites.fim;
  const gente = membros
    ? Object.values(b.usuarios).filter(u => membros.includes(u.id))
    : Object.values(b.usuarios).filter(u => u.aparecer && (!!u.phizId || u.id === eu));
  return gente.map(u => {
    const ts = b.treinos.filter(t => t.uid === u.id && t.dia >= ini && t.dia <= dia && !t.pendenteFoto);
    const porDia = new Map<string, Treino[]>();
    ts.forEach(t => porDia.set(t.dia, [...(porDia.get(t.dia) || []), t]));
    const l = [...porDia.values()];
    const min = l.reduce((a, x) => a + minutosDoDia(x), 0);
    const km = Math.round(l.reduce((a, x) => a + kmDoDia(x), 0) * 10) / 10;
    const pontos = l.reduce((a, x) => a + pontosDoDia(x), 0);
    const dias = porDia.size;
    const hoje = ts.filter(t => t.dia === dia);
    const ultimo = [...hoje].sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))[0];
    const valor = metrica === "dias" ? dias : metrica === "duracao" ? min : metrica === "distancia" ? km : pontos;
    return {
      uid: u.id, nome: u.nome, avatar: u.avatar, verificado: ehVerificado(u),
      cutuquei: (b.cutucadas || []).some(x => x.de === eu && x.para === u.id && x.dia === dia),
      treinouHoje: b.treinos.some(t => t.uid === u.id && t.dia === dia && !t.pendenteFoto),
      trofeus: (b.vitorias || []).filter(v => v.uid === u.id).length,
      valor, min, km, dias, pontos, treinos: ts.length,
      fez: fezTexto(hoje, u.id === eu),
      fotoKey: ultimo?.fotoKey,
      tpRecebidos: b.tapagos.filter(x => x.para === u.id && x.dia === dia).length,
      deiTp: b.tapagos.some(x => x.de === eu && x.para === u.id && x.dia === dia),
    };
  }).sort((a, c) => c.valor - a.valor || c.pontos - a.pontos || a.nome.localeCompare(c.nome));
}
