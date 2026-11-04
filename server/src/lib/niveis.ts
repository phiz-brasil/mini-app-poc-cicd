import type { Banco, Treino } from "./store";
import { pontosDoDia } from "./ranking";

/**
 * Gamificação de longo prazo do Tá Pago! (PROPOSTA — ainda não aparece no app).
 *
 * Inspiração: Zwift (níveis 1→100 que levam anos, nunca caem, cada nível destrava algo),
 * Nike Run Club (faixas por cor), Strava (item que não se compra, só se conquista), Duolingo
 * (vitórias rápidas no começo), battle pass (temporadas).
 *
 * Regras de base:
 *   · XP = Pontos Tá Pago! que já existem (10 por dia treinado + 1 a cada 5 min + 1 por km; máx. 54/dia).
 *     Só treino validado conta, então a antifraude da foto e o teto diário protegem os níveis.
 *   · Nível nunca cai. Ranking da semana zera; o nível é a história da pessoa.
 *   · Curva: começo sem atropelo (quem treina pesado a 1ª semana fecha no nível 3), fim longo
 *     (4x/semana: nível 10 ≈ 2 meses, 20 ≈ 6 meses, 60 ≈ 5 anos).
 *   · Fórmula: XP total pro nível n = 1,6·(n−1)^2,346 + 50·(n−1), arredondado.
 */

export const NIVEL_MAX = 100;
const A = 1.6, B = 2.346, LIN = 50;

const redondo = (x: number) => (x < 1000 ? Math.round(x / 5) * 5 : x < 10000 ? Math.round(x / 10) * 10 : Math.round(x / 50) * 50);

/** XP total pra chegar no nível n (nível 1 = 0). */
export function xpDoNivel(n: number): number {
  if (n <= 1) return 0;
  return redondo(A * Math.pow(n - 1, B) + LIN * (n - 1));
}

/** Nível, progresso e quanto falta, a partir do XP total. */
export function nivelDe(xp: number) {
  let n = 1;
  while (n < NIVEL_MAX && xp >= xpDoNivel(n + 1)) n++;
  const ini = xpDoNivel(n), prox = n < NIVEL_MAX ? xpDoNivel(n + 1) : ini;
  return { nivel: n, faixa: faixaDe(n), xp, noNivel: xp - ini, precisa: prox - ini, falta: Math.max(0, prox - xp), pct: prox > ini ? (xp - ini) / (prox - ini) : 1 };
}

export type Faixa = { id: string; nome: string; de: number; ate: number; cor: string; tinta: string; frase: string; /** Cor nos gráficos (visível no claro e no escuro). */ barra: string };

/** As faixas (como as cores do Nike Run Club): cada uma é uma fase da vida no app. */
export const FAIXAS: Faixa[] = [
  { id: "bicho", barra: "#BDBDB7", nome: "Animado", de: 1, ate: 9, cor: "#E4E4E0", tinta: "#111111", frase: "Os primeiros treinos. Sobe de nível a cada poucos treinos." },
  { id: "forte", barra: "#C6F432", nome: "Forte", de: 10, ate: 19, cor: "#C6F432", tinta: "#111111", frase: "Já virou hábito. Cerca de 2 meses de quem treina 4x por semana." },
  { id: "sinistro", barra: "#2EC4B6", nome: "Sinistro", de: 20, ate: 29, cor: "#2EC4B6", tinta: "#111111", frase: "Meses de constância. Aqui começam os cupons maiores." },
  { id: "casca", barra: "#FF7A1A", nome: "Casca grossa", de: 30, ate: 39, cor: "#FF7A1A", tinta: "#111111", frase: "Quase 1 ano firme. Libera a Loja Tá Pago!." },
  { id: "monstro", barra: "#8B5CF6", nome: "Monstro", de: 40, ate: 49, cor: "#8B5CF6", tinta: "#FFFFFF", frase: "Gente rara. Brinde físico e acesso antecipado." },
  { id: "lenda", barra: "#6E6E68", nome: "Lenda", de: 50, ate: 59, cor: "#111111", tinta: "#C6F432", frase: "Anos de treino. Kit numerado e convite pra eventos." },
  { id: "black", barra: "#E8C66A", nome: "Tá Pago Black", de: 60, ate: 100, cor: "#0B0B0B", tinta: "#E8C66A", frase: "O topo. Não se compra: só se conquista." },
];

export function faixaDe(n: number): Faixa {
  return FAIXAS.find(f => n >= f.de && n <= f.ate) || FAIXAS[FAIXAS.length - 1];
}

export type TipoRecompensa = "app" | "cupom" | "loja" | "brinde";
export type Recompensa = { nivel: number; tipo: TipoRecompensa; nome: string; detalhe: string };

/**
 * O que cada marco destrava. "app" = dentro do miniapp (custo zero, escala); "cupom" = parceiro;
 * "loja" = item que só pode ser comprado a partir desse nível (desejo, estilo camiseta do Strava);
 * "brinde" = físico, enviado pelo time (tem custo: planejar com a projeção do admin).
 */
export const RECOMPENSAS: Recompensa[] = [
  { nivel: 2, tipo: "app", nome: "Selo de nível", detalhe: "O número do nível aparece ao lado do nome no ranking e no perfil." },
  { nivel: 5, tipo: "app", nome: "Moldura Animado", detalhe: "Moldura cinza no avatar." },
  { nivel: 10, tipo: "app", nome: "Moldura Forte + arte Neon", detalhe: "Moldura limão no avatar e um tema novo pra arte de post." },
  { nivel: 10, tipo: "cupom", nome: "Cupom de boas-vindas", detalhe: "Ex.: 10% numa loja esportiva parceira." },
  { nivel: 15, tipo: "app", nome: "Título \"Forte\"", detalhe: "Aparece embaixo do nome no perfil." },
  { nivel: 20, tipo: "app", nome: "Card de treino Sinistro", detalhe: "Fundo exclusivo no card do treino." },
  { nivel: 20, tipo: "cupom", nome: "Cupom 15%", detalhe: "Parceiro de suplemento ou vestuário." },
  { nivel: 25, tipo: "app", nome: "Arte de post animada", detalhe: "Moldura animada pra postar no Moments." },
  { nivel: 30, tipo: "loja", nome: "Loja Tá Pago! liberada", detalhe: "Camiseta oficial: só compra quem é nível 30+." },
  { nivel: 30, tipo: "brinde", nome: "Adesivos Casca grossa", detalhe: "Kit de adesivos enviado pra casa." },
  { nivel: 35, tipo: "loja", nome: "Boné Tá Pago!", detalhe: "Entra na loja a partir do 35." },
  { nivel: 40, tipo: "brinde", nome: "Garrafa oficial", detalhe: "Squeeze Monstro, enviado pelo time." },
  { nivel: 40, tipo: "app", nome: "Acesso antecipado", detalhe: "Testa as novidades do app antes de todo mundo." },
  { nivel: 45, tipo: "loja", nome: "Moletom Monstro", detalhe: "Entra na loja a partir do 45." },
  { nivel: 50, tipo: "brinde", nome: "Camiseta Lenda numerada", detalhe: "Edição numerada + convite pra um treino/evento com o time." },
  { nivel: 60, tipo: "brinde", nome: "Jaqueta Tá Pago Black", detalhe: "Numerada, com o nome. Nome entra no mural Black do app." },
  { nivel: 75, tipo: "brinde", nome: "Troféu Black 75", detalhe: "Peça física de colecionador." },
  { nivel: 100, tipo: "brinde", nome: "Imortal", detalhe: "Reconhecimento máximo, definido quando alguém chegar perto." },
];

/** Insígnias: conquistas pontuais (estilo Strava/Apple). Só visuais: não dão XP, pra não inflar os níveis. */
export const INSIGNIAS = [
  { nome: "Primeiro tá pago", regra: "1º treino validado" },
  { nome: "Semana cheia", regra: "Treinou 5 dias numa semana" },
  { nome: "Sequência de 7", regra: "7 dias seguidos" },
  { nome: "Sequência de 30", regra: "30 dias seguidos" },
  { nome: "Madrugador", regra: "10 treinos antes das 7h" },
  { nome: "Centena", regra: "100 km somados" },
  { nome: "Mil minutos", regra: "1.000 min de treino" },
  { nome: "Campeão da semana", regra: "Venceu a semana num grupo ou no geral" },
  { nome: "Fundador", regra: "Entrou no beta (2026)" },
  { nome: "Puxador", regra: "Criou um grupo com 5+ pessoas" },
];

/** Temporadas (como battle pass): a cada 3 meses, uma meta com medalha própria. O nível não zera; a temporada sim. */
export const TEMPORADA = {
  duracao: "3 meses",
  meta: "60 dias pagos na temporada",
  premio: "Medalha da temporada no perfil (colecionável, uma por temporada)",
};

/** Perfis pra simular quanto tempo leva (XP por semana). */
export const PERFIS = [
  { nome: "Casual", detalhe: "2x por semana, 30 min", xpSemana: 2 * 19 },
  { nome: "Regular", detalhe: "4x por semana, 45 min", xpSemana: 4 * 24 },
  { nome: "Dedicado", detalhe: "6x por semana, 60 min", xpSemana: 6 * 30 },
];

/** XP da pessoa = soma dos pontos de cada dia com treino validado (o mesmo do ranking geral). */
export function xpDe(b: Banco, uid: string, semId?: string): number {
  const porDia = new Map<string, Treino[]>();
  b.treinos.filter(t => t.uid === uid && !t.pendenteFoto && t.id !== semId).forEach(t => porDia.set(t.dia, [...(porDia.get(t.dia) || []), t]));
  let xp = 0;
  porDia.forEach(l => { xp += pontosDoDia(l); });
  return xp;
}

const faixaCurta = (f: Faixa) => ({ id: f.id, nome: f.nome, cor: f.cor, tinta: f.tinta, de: f.de, ate: f.ate });

/** O que o app mostra do nível (só no perfil da própria pessoa). */
export function resumoNivel(xp: number) {
  const r = nivelDe(xp);
  const proxima = RECOMPENSAS.find(x => x.nivel > r.nivel);
  return {
    nivel: r.nivel, xp, noNivel: r.noNivel, precisa: r.precisa, falta: r.falta, pct: Math.round(r.pct * 1000) / 1000,
    faixa: faixaCurta(r.faixa), proximaFaixa: FAIXAS.find(f => f.de > r.nivel) ? faixaCurta(FAIXAS.find(f => f.de > r.nivel)!) : null,
    proxima: proxima ? { nivel: proxima.nivel, nome: proxima.nome, tipo: proxima.tipo } : null,
  };
}

/** A jornada inteira pro perfil: cada faixa e cada recompensa, com o que já foi destravado. */
export function jornada(nivel: number) {
  return FAIXAS.map(f => ({
    ...faixaCurta(f), frase: f.frase, alcancada: nivel >= f.de, atual: nivel >= f.de && nivel <= f.ate,
    recompensas: RECOMPENSAS.filter(r => r.nivel >= f.de && r.nivel <= f.ate).map(r => ({ ...r, destravada: nivel >= r.nivel })),
  }));
}

/** Subiu de nível desde a última vez que a pessoa viu? (sem nada visto = revelação dos níveis). */
export function subidaDeNivel(xp: number, visto?: number) {
  const atual = nivelDe(xp).nivel;
  // visto > atual só acontece quando a curva muda: o painel acerta o visto e a próxima subida comemora normal.
  if (visto !== undefined && atual <= visto) return null;
  // Sem nada visto = revelação: mostra o nível da pessoa (até o 1, pra quem ainda não treinou) e convida a começar.
  const de = visto ?? 0;
  const fa = faixaDe(atual), fv = de > 0 ? faixaDe(de) : null;
  return {
    de, para: atual, revelacao: visto === undefined, faixaNova: !fv || fv.id !== fa.id, faixa: faixaCurta(fa), frase: fa.frase,
    recompensas: RECOMPENSAS.filter(r => r.nivel > de && r.nivel <= atual).map(r => ({ nivel: r.nivel, nome: r.nome, tipo: r.tipo, detalhe: r.detalhe })),
  };
}
