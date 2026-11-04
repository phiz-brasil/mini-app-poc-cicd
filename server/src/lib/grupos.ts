import { alterarBanco, lerBanco, type Grupo } from "./store";
import { diaSP, METRICAS, nomeDoTipo, type Metrica, type Periodo } from "./tipos";
import { ehVerificado, pontosDoDia, rankingPor } from "./ranking";
import { urlNoStrava } from "./strava";
import { itemTimeline, visivelNoGrupo } from "./timeline";
import { ErroAcao, novoId } from "./acoes";

/**
 * Grupos do Tá Pago! (dentro do miniapp). O convite vai pelo chat do PhizChat:
 * o miniapp é encaminhado com `?convite=<codigo>` e quem abre entra no grupo.
 */

const LETRAS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I/L
const codigo = () => Array.from({ length: 6 }, () => LETRAS[Math.floor(Math.random() * LETRAS.length)]).join("");

export const publicoGrupo = (g: Grupo, uid: string) => ({
  id: g.id, nome: g.nome, codigo: g.codigo, metrica: g.metrica || "duracao", membros: g.membros.length, inicio: g.inicio || "", fim: g.fim || "", souCriador: g.criador === uid, criadoEm: g.criadoEm,
});

export async function meusGrupos(uid: string) {
  const b = await lerBanco();
  return b.grupos.filter(g => g.membros.includes(uid)).sort((a, c) => a.criadoEm.localeCompare(c.criadoEm)).map(g => publicoGrupo(g, uid));
}

/** Datas opcionais do desafio (YYYY-MM-DD): fim depois do início. */
function datasDoDesafio(inicio?: string, fim?: string) {
  const ok = (d?: string) => !d || /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (!ok(inicio) || !ok(fim)) throw new ErroAcao("Data inválida.");
  if (inicio && fim && fim < inicio) throw new ErroAcao("O fim tem que ser depois do início.");
  return { ...(inicio ? { inicio } : {}), ...(fim ? { fim } : {}) };
}

export async function criarGrupo(uid: string, nome: string, metrica: string, inicio?: string, fim?: string) {
  const m = (METRICAS as string[]).includes(metrica) ? (metrica as Grupo["metrica"]) : "dias";
  const n = String(nome || "").trim().replace(/\s+/g, " ").slice(0, 32);
  if (n.length < 2) throw new ErroAcao("Dê um nome pro grupo.");
  const datas = datasDoDesafio(inicio, fim);
  return alterarBanco(b => {
    if (!b.usuarios[uid]) throw new ErroAcao("Usuário não encontrado.", 404);
    if (b.grupos.filter(g => g.criador === uid).length >= 10) throw new ErroAcao("Você já criou 10 grupos.");
    let c = codigo();
    while (b.grupos.some(g => g.codigo === c)) c = codigo();
    const g: Grupo = { id: novoId(), nome: n, codigo: c, criador: uid, metrica: m, ...datas, membros: [uid], criadoEm: new Date().toISOString() };
    b.grupos.push(g);
    return publicoGrupo(g, uid);
  });
}

export async function entrarNoGrupo(uid: string, cod: string) {
  const c = String(cod || "").trim().toUpperCase();
  return alterarBanco(b => {
    const g = b.grupos.find(x => x.codigo === c);
    if (!g) throw new ErroAcao("Convite não encontrado.", 404);
    const novo = !g.membros.includes(uid);
    if (novo) {
      if (g.membros.length >= 200) throw new ErroAcao("Esse grupo está cheio.");
      g.membros.push(uid);
    }
    return { grupo: publicoGrupo(g, uid), novo, criadorNome: b.usuarios[g.criador]?.nome || "" };
  });
}

export async function sairDoGrupo(uid: string, id: string) {
  await alterarBanco(b => {
    const g = b.grupos.find(x => x.id === id);
    if (!g) return;
    g.membros = g.membros.filter(m => m !== uid);
    if (!g.membros.length) b.grupos = b.grupos.filter(x => x.id !== id);
    else if (g.criador === uid) g.criador = g.membros[0];
  });
}

export async function grupoDe(uid: string, id: string): Promise<{ membros: string[]; metrica: Metrica } | null> {
  if (!id) return null;
  const b = await lerBanco();
  const g = b.grupos.find(x => x.id === id && x.membros.includes(uid));
  return g ? { membros: g.membros, metrica: g.metrica || "duracao" } : null;
}

/**
 * Tudo da página do grupo (estilo clube do Strava): o ranking é o centro, com
 * pódio, quanto falta pra passar quem está na frente, o total do grupo e o
 * feed dos últimos treinos de quem está no grupo.
 */
export async function paginaDoGrupo(uid: string, id: string, periodo: Periodo) {
  const b = await lerBanco();
  const g = b.grupos.find(x => x.id === id && x.membros.includes(uid));
  if (!g) throw new ErroAcao("Grupo não encontrado.", 404);
  const metrica: Metrica = g.metrica || "duracao";
  const dia = diaSP();
  const ranking = rankingPor(b, uid, dia, periodo, metrica, g.membros, { inicio: g.inicio, fim: g.fim });
  const soma = ranking.reduce((a, r) => ({ dias: a.dias + r.dias, min: a.min + r.min, km: a.km + r.km, treinos: a.treinos + r.treinos }), { dias: 0, min: 0, km: 0, treinos: 0 });
  const feed = b.treinos
    .filter(t => g.membros.includes(t.uid) && t.validacao?.status !== "recusada" && !t.pendenteFoto && visivelNoGrupo(t, uid, g.id))
    .sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))
    .slice(0, 20)
    .map(t => {
      const u = b.usuarios[t.uid];
      // Mesmo item da timeline geral (com o card da categoria quando não tem foto).
      return {
        ...itemTimeline(b, t, uid), verificado: u ? ehVerificado(u) : false,
        fonte: t.fonte, noStrava: t.uid === uid ? urlNoStrava(t.externoId) : "",
      };
    });
  return {
    grupo: publicoGrupo(g, uid), metrica, periodo, ranking, soma, feed, hoje: dia,
    desafio: { inicio: g.inicio || "", fim: g.fim || "", encerrado: !!g.fim && g.fim < dia, comecaEm: g.inicio && g.inicio > dia ? g.inicio : "" },
    membros: g.membros.map(m => ({ uid: m, nome: b.usuarios[m]?.nome || "", avatar: b.usuarios[m]?.avatar })).slice(0, 8),
  };
}

/**
 * Convidar amigos do PhizChat (vindos do pz.getFriends no aparelho) pra um grupo.
 * Fica guardado pelo PhizID; quando a pessoa abre o Tá Pago!, aparece o convite na home.
 * Máx. 30 por vez, e não repete convite pendente pro mesmo grupo.
 */
export async function convidarAmigos(uid: string, grupoId: string, amigos: { phizId: string; nome?: string }[]) {
  const lista = (amigos || []).map(a => ({ phizId: String(a.phizId || "").replace(/[^\w.-]/g, "").slice(0, 64), nome: String(a.nome || "").slice(0, 40) })).filter(a => a.phizId).slice(0, 30);
  if (!lista.length) throw new ErroAcao("Escolha quem convidar.");
  return alterarBanco(b => {
    const g = b.grupos.find(x => x.id === grupoId && x.membros.includes(uid));
    if (!g) throw new ErroAcao("Grupo não encontrado.", 404);
    const ja = new Set(g.membros.map(m => b.usuarios[m]?.phizId).filter(Boolean));
    let novos = 0;
    for (const a of lista) {
      if (ja.has(a.phizId)) continue;
      if (b.convites.some(c => c.grupo === g.id && c.paraPhizId === a.phizId && c.status === "pendente")) continue;
      b.convites.push({ id: novoId(), grupo: g.id, de: uid, paraPhizId: a.phizId, nome: a.nome || undefined, em: new Date().toISOString(), status: "pendente" });
      novos++;
    }
    return { convidados: novos, membros: g.membros.length };
  });
}

/** Convites pendentes pra mim (pelo meu PhizID). */
export function convitesPraMim(b: import("./store").Banco, uid: string) {
  const eu = b.usuarios[uid];
  if (!eu?.phizId) return [];
  return b.convites.filter(c => c.status === "pendente" && c.paraPhizId === eu.phizId).map(c => {
    const g = b.grupos.find(x => x.id === c.grupo);
    if (!g || g.membros.includes(uid)) return null;
    return { id: c.id, grupo: g.nome, grupoId: g.id, de: (b.usuarios[c.de]?.nome || "").split(" ")[0], membros: g.membros.length };
  }).filter(Boolean) as { id: string; grupo: string; grupoId: string; de: string; membros: number }[];
}

export async function responderConvite(uid: string, id: string, aceitar: boolean) {
  return alterarBanco(b => {
    const eu = b.usuarios[uid];
    const c = b.convites.find(x => x.id === id && x.paraPhizId === eu?.phizId && x.status === "pendente");
    if (!c) throw new ErroAcao("Convite não encontrado.", 404);
    c.status = aceitar ? "aceito" : "recusado";
    const g = b.grupos.find(x => x.id === c.grupo);
    if (aceitar && g && !g.membros.includes(uid)) {
      if (g.membros.length >= 200) throw new ErroAcao("Esse grupo está cheio.");
      g.membros.push(uid);
    }
    return { grupo: g ? publicoGrupo(g, uid) : null };
  });
}

/** PhizIDs de quem já está no grupo (pra marcar no seletor). */
export async function phizIdsDoGrupo(uid: string, grupoId: string) {
  const b = await lerBanco();
  const g = b.grupos.find(x => x.id === grupoId && x.membros.includes(uid));
  if (!g) throw new ErroAcao("Grupo não encontrado.", 404);
  return {
    membros: g.membros.map(m => b.usuarios[m]?.phizId).filter(Boolean) as string[],
    convidados: b.convites.filter(c => c.grupo === g.id && c.status === "pendente").map(c => c.paraPhizId),
  };
}

/** Admin (quem criou) edita o grupo: nome, como conta e o período do desafio (opcional). */
export async function editarGrupo(uid: string, id: string, p: { nome?: string; metrica?: string; inicio?: string; fim?: string }) {
  datasDoDesafio(p.inicio, p.fim);
  return alterarBanco(b => {
    const g = b.grupos.find(x => x.id === id);
    if (!g || !g.membros.includes(uid)) throw new ErroAcao("Grupo não encontrado.", 404);
    if (g.criador !== uid) throw new ErroAcao("Só quem criou o grupo pode editar.", 403);
    if (typeof p.nome === "string") { const n = p.nome.trim().replace(/\s+/g, " ").slice(0, 32); if (n.length >= 2) g.nome = n; }
    if (p.metrica && (METRICAS as string[]).includes(p.metrica)) g.metrica = p.metrica as Grupo["metrica"];
    if ("inicio" in p) { if (p.inicio) g.inicio = p.inicio; else delete g.inicio; }
    if ("fim" in p) { if (p.fim) g.fim = p.fim; else delete g.fim; }
    return publicoGrupo(g, uid);
  });
}
