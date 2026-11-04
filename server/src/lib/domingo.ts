import { alterarBanco, type Banco } from "./store";
import type { DadosPodio } from "./arte-podio";
import type { DadosCampeao } from "./arte-campeao";
import { rankingPor } from "./ranking";
import { diaSP, segundaDe, type Metrica } from "./tipos";

/**
 * Resumo de domingo: quem ganhou a semana em cada grupo (na métrica do grupo)
 * e no ranking geral (pontos). Usado pela arte do pódio e pela mensagem do chat.
 */
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const UN: Record<Metrica, [string, string]> = { pontos: ["pt", "pts"], dias: ["dia", "dias"], duracao: ["min", "min"], distancia: ["km", "km"] };

export function rotuloSemana(dia = diaSP()): string {
  const ini = new Date(segundaDe(dia) + "T12:00:00Z"), fim = new Date(ini); fim.setUTCDate(fim.getUTCDate() + 6);
  const m1 = MESES[ini.getUTCMonth()], m2 = MESES[fim.getUTCMonth()];
  return m1 === m2 ? `${ini.getUTCDate()} a ${fim.getUTCDate()} ${m2}` : `${ini.getUTCDate()} ${m1} a ${fim.getUTCDate()} ${m2}`;
}

export function podioDe(b: Banco, chave: string, uid: string, dia = diaSP()): (DadosPodio & { membros: number; metrica: Metrica }) | null {
  const g = chave === "geral" ? null : b.grupos.find(x => x.id === chave);
  if (chave !== "geral" && !g) return null;
  const metrica: Metrica = g ? g.metrica || "duracao" : "pontos";
  const lista = rankingPor(b, uid, dia, "semana", metrica, g ? g.membros : null);
  const fmt = (v: number) => (metrica === "distancia" ? String(v).replace(".", ",") : String(v));
  const un = (v: number) => (v === 1 ? UN[metrica][0] : UN[metrica][1]);
  const top = lista.filter(r => r.valor > 0).slice(0, 3).map(r => ({ nome: r.nome, avatar: r.avatar, valor: fmt(r.valor), un: un(r.valor), eu: r.uid === uid }));
  const i = lista.findIndex(r => r.uid === uid);
  return {
    titulo: g ? g.nome : "Ranking geral", semana: rotuloSemana(dia), top, membros: lista.length, metrica,
    eu: i >= 0 ? { pos: i + 1, total: lista.length, valor: fmt(lista[i].valor), un: un(lista[i].valor) } : undefined,
  };
}

/**
 * Fecha uma semana (segunda → domingo): guarda o 1º lugar de cada grupo (2+ pessoas)
 * e do geral. Idempotente: não repete semana+chave. Empate no topo = todos levam.
 */
export async function fecharSemana(segunda: string): Promise<number> {
  const dom = new Date(segunda + "T12:00:00Z"); dom.setUTCDate(dom.getUTCDate() + 6);
  const diaFim = dom.toISOString().slice(0, 10);
  return alterarBanco(b => {
    let n = 0;
    const chaves = [...b.grupos.filter(g => g.membros.length >= 2).map(g => g.id), "geral"];
    for (const chave of chaves) {
      if (b.vitorias.some(v => v.semana === segunda && v.chave === chave)) continue;
      const g = chave === "geral" ? null : b.grupos.find(x => x.id === chave)!;
      const metrica: Metrica = g ? g.metrica || "duracao" : "pontos";
      const lista = rankingPor(b, "", diaFim, "semana", metrica, g ? g.membros : null);
      const top = lista[0];
      if (!top || top.valor <= 0 || lista.length < 2) continue;
      const fmt = (v: number) => (metrica === "distancia" ? String(v).replace(".", ",") : String(v));
      for (const r of lista.filter(x => x.valor === top.valor)) {
        b.vitorias.push({
          id: Math.random().toString(36).slice(2, 10), semana: segunda, chave, titulo: g ? g.nome : "Ranking geral", uid: r.uid,
          valor: fmt(r.valor), un: r.valor === 1 ? UN[metrica][0] : UN[metrica][1], membros: lista.length, em: new Date().toISOString(),
        });
        n++;
      }
    }
    return n;
  });
}

/** A semana passada já fechou? Se não, fecha (a home chama isso; o cron de domingo também). */
export async function fecharSemanaPassadaSeFaltar(b: Banco): Promise<void> {
  const seg = new Date(segundaDe(diaSP()) + "T12:00:00Z"); seg.setUTCDate(seg.getUTCDate() - 7);
  const passada = seg.toISOString().slice(0, 10);
  if (b.vitorias.some(v => v.semana === passada)) return;
  // Só vale a pena se alguém treinou naquela semana.
  const fim = new Date(seg); fim.setUTCDate(fim.getUTCDate() + 6);
  if (!b.treinos.some(t => t.dia >= passada && t.dia <= fim.toISOString().slice(0, 10))) return;
  await fecharSemana(passada);
}

export const trofeusDe = (b: Banco, uid: string) => b.vitorias.filter(v => v.uid === uid);

/** Dados da arte do campeão a partir de uma vitória guardada. */
export function dadosCampeao(b: Banco, vitoriaId: string): DadosCampeao | null {
  const v = b.vitorias.find(x => x.id === vitoriaId);
  const u = v && b.usuarios[v.uid];
  if (!v || !u) return null;
  const domingo = new Date(v.semana + "T12:00:00Z"); domingo.setUTCDate(domingo.getUTCDate() + 6);
  const ate = b.vitorias.filter(x => x.uid === v.uid && x.semana <= v.semana).length;
  return { nome: u.nome, avatar: u.avatar, titulo: v.titulo, semana: rotuloSemana(domingo.toISOString().slice(0, 10)),
    valor: v.valor, un: v.un, membros: v.membros, total: ate, genero: u.genero };
}
