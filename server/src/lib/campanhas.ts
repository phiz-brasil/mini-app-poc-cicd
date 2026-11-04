import { get, put } from "@vercel/blob";
import type { Banco, Usuario } from "./store";
import { diaSP } from "./tipos";

/**
 * Personalização ao vivo, sem atualizar o miniapp: conquistas (badges) e temas do dia.
 * O app só sabe desenhar "uma conquista" e "um tema"; o que existe, quando vale e como fica vem daqui.
 * Criar ou mudar pelo /admin/campanhas. Padrões abaixo + o que o admin salvou em tapago/campanhas.json.
 *
 * Conquista: imagem, nome, regra (todos até uma data / treinou entre duas datas / só manual) e quando aparece
 * bloqueada no perfil ("Só em 31/10") pra criar vontade. Quem ganhou fica em usuario.conquistas pra sempre.
 * Tema: entre duas datas (dias de São Paulo), muda o card da home, mostra uma faixa no topo e põe um enfeite
 * nos avatares. "testadores" veem o tema (e podem ganhar a conquista) antes da data, pra conferir.
 * Testadores ficam só no que o admin salva (nunca id de pessoa no código).
 */

const KEY = "tapago/campanhas.json";

export type Regra =
  | { tipo: "todos"; ate?: string } // contas criadas até a data (inclusive)
  | { tipo: "treino"; inicio: string; fim: string } // treinou (treino válido) num dia entre início e fim
  | { tipo: "manual" }; // só quem o admin der

export type Conquista = {
  id: string;
  nome: string;
  /** Uma frase: o que a pessoa fez pra ganhar. */
  descricao: string;
  /** Caminho público (/campanhas/x.png) ou de mídia enviada pelo admin (/api/midia/...). */
  imagem: string;
  /** Cor de destaque da comemoração e do card. */
  cor: string;
  /** Selo pequeno no card: "Edição limitada", "Beta 2026"… */
  edicao?: string;
  regra: Regra;
  /** A partir desse dia aparece bloqueada no perfil de quem ainda não tem. */
  mostrarDe?: string;
  ativa: boolean;
  /** Mensagem no chat de manhã, no dia da campanha (regra de treino), pra quem ainda não ganhou. Vazio = texto da régua. */
  mensagem?: string;
  /** Ganham sem cumprir a regra (teste antes da data). */
  testadores?: string[];
  ordem?: number;
};

export type Tema = {
  id: string;
  nome: string;
  inicio: string;
  fim: string;
  ativo: boolean;
  /** Cor de destaque do dia. */
  cor: string;
  /** Faixa no topo da home. `conquista` = id da conquista que a faixa abre. */
  faixa?: { titulo: string; texto: string; imagem?: string; conquista?: string };
  /** Card grande da home (o verde). */
  card?: { fundo: string; imagem?: string; tinta: string; apoio: string; barra: string; barraOn: string; botao: string; botaoTexto: string };
  /** Enfeite por cima dos avatares (x, y e largura em % do avatar). */
  enfeite?: { imagem: string; x: number; y: number; w: number };
  testadores?: string[];
};

type Salvo = { conquistas: Conquista[]; temas: Tema[] };

export const CONQUISTAS_PADRAO: Conquista[] = [
  { id: "fundador", nome: "Fundador", descricao: "Estava no Tá Pago! desde o começo.", imagem: "/campanhas/selo-fundador.png", cor: "#C6F432",
    edicao: "Beta 2026", regra: { tipo: "todos", ate: "2026-10-31" }, ativa: true, ordem: 1 },
  { id: "halloween-2026", nome: "Halloween 2026", descricao: "Treinou no dia 31 de outubro de 2026.", imagem: "/campanhas/selo-halloween.png", cor: "#FF8A1F",
    edicao: "Edição limitada", regra: { tipo: "treino", inicio: "2026-10-31", fim: "2026-10-31" }, mostrarDe: "2026-10-28", ativa: true, ordem: 2,
    mensagem: "🎃 {nome}, hoje é Halloween no Tá Pago!\n\nTreine hoje e ganhe o badge Halloween 2026, edição limitada. Ele fica no seu perfil pra sempre, mas só vale hoje!" },
];

export const TEMAS_PADRAO: Tema[] = [
  { id: "halloween-2026", nome: "Halloween", inicio: "2026-10-31", fim: "2026-10-31", ativo: true, cor: "#FF8A1F",
    faixa: { titulo: "Halloween no Tá Pago! 🎃", texto: "Treine hoje e ganhe o badge de Halloween. Só hoje.", imagem: "/campanhas/selo-halloween.png", conquista: "halloween-2026" },
    card: { fundo: "linear-gradient(150deg, #2B0F45 0%, #170824 60%, #0B0612 100%)", imagem: "/campanhas/card-halloween.png", tinta: "#FFFFFF", apoio: "#FFB866",
      barra: "rgba(255,255,255,.16)", barraOn: "#FF8A1F", botao: "#FF8A1F", botaoTexto: "#1A0E04" },
    enfeite: { imagem: "/campanhas/enfeite-chapeu-bruxa.png", x: -4, y: -60, w: 100 } },
];

let cache: { em: number; s: Salvo } | null = null;

async function lerSalvo(): Promise<Salvo> {
  try {
    const r = await get(KEY, { access: "private", useCache: false });
    if (r && r.statusCode === 200 && r.stream) { const j = JSON.parse(await new Response(r.stream).text()) as Partial<Salvo>; return { conquistas: j.conquistas || [], temas: j.temas || [] }; }
  } catch { /* nada salvo ainda */ }
  return { conquistas: [], temas: [] };
}

/** Padrão com o que o admin salvou por cima (mesmo id substitui; id novo entra). */
export async function lerCampanhas(): Promise<Salvo> {
  if (cache && Date.now() - cache.em < 30_000) return cache.s;
  const s = await lerSalvo();
  const junta = <T extends { id: string }>(pad: T[], sal: T[]) => [...pad.filter(p => !sal.some(x => x.id === p.id)), ...sal];
  const r = { conquistas: junta(CONQUISTAS_PADRAO, s.conquistas).sort((a, b) => (a.ordem ?? 99) - (b.ordem ?? 99)), temas: junta(TEMAS_PADRAO, s.temas) };
  cache = { em: Date.now(), s: r };
  return r;
}

export async function salvarCampanhas(s: Salvo) {
  await put(KEY, JSON.stringify(s), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
  cache = null;
}
/** O que o admin salvou (sem os padrões), pra editar. */
export const lerSalvoAdmin = lerSalvo;

/** Tema que vale pra essa pessoa hoje (testador vê antes). */
export function temaDe(temas: Tema[], uid: string, dia = diaSP()): Tema | null {
  return temas.find(t => t.ativo && ((dia >= t.inicio && dia <= t.fim) || (t.testadores || []).includes(uid))) || null;
}

/** A pessoa cumpre a regra? */
function cumpre(c: Conquista, b: Banco, u: Usuario): boolean {
  if ((c.testadores || []).includes(u.id)) return true;
  const r = c.regra;
  if (r.tipo === "todos") return !r.ate || (u.criadoEm || "").slice(0, 10) <= r.ate;
  if (r.tipo === "treino") return b.treinos.some(t => t.uid === u.id && !t.pendenteFoto && t.dia >= r.inicio && t.dia <= r.fim);
  return false;
}

/** Conquistas que a pessoa acabou de ganhar (ainda não estão na conta). Não grava: quem chama grava. */
export function novasConquistas(lista: Conquista[], b: Banco, u: Usuario): Conquista[] {
  const tem = new Set((u.conquistas || []).map(x => x.id));
  return lista.filter(c => c.ativa && !tem.has(c.id) && cumpre(c, b, u));
}

/** O que o app mostra: as que tenho e as bloqueadas que já podem aparecer. */
export function vitrine(lista: Conquista[], u: Usuario, outro = false, dia = diaSP()) {
  const minhas = new Map((u.conquistas || []).map(x => [x.id, x]));
  const card = (c: Conquista) => ({ id: c.id, nome: c.nome, descricao: c.descricao, imagem: c.imagem, cor: c.cor, edicao: c.edicao || "" });
  const ganhas = lista.filter(c => minhas.has(c.id)).map(c => ({ ...card(c), ganhaEm: minhas.get(c.id)!.em }))
    .sort((a, b) => b.ganhaEm.localeCompare(a.ganhaEm));
  // Bloqueadas: só no meu perfil, só as ativas que ainda dá pra ganhar e já podem aparecer.
  const bloqueadas = outro ? [] : lista.filter(c => c.ativa && !minhas.has(c.id) && c.mostrarDe && dia >= c.mostrarDe && (c.regra.tipo !== "treino" || dia <= c.regra.fim))
    .map(c => ({ ...card(c), quando: c.regra.tipo === "treino" ? quandoTxt(c.regra.inicio, c.regra.fim) : "" }));
  return { ganhas, bloqueadas };
}

function quandoTxt(ini: string, fim: string) {
  const f = (d: string) => `${Number(d.slice(8, 10))}/${d.slice(5, 7)}`;
  return ini === fim ? `Só em ${f(ini)}` : `De ${f(ini)} a ${f(fim)}`;
}

/** O tema no formato que o app usa (só o necessário). */
export function temaPraApp(t: Tema | null) {
  if (!t) return null;
  return { id: t.id, cor: t.cor, faixa: t.faixa || null, card: t.card || null, enfeite: t.enfeite || null };
}
