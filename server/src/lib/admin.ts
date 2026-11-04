import type { Banco, Treino, Usuario } from "./store";
import type { EnvioReg, Metricas } from "./metricas";
import { pontosDoDia } from "./ranking";
import { diaSP, nomeDoTipo, segundaDe } from "./tipos";

/**
 * Todos os números do painel de admin, calculados do banco + métricas.
 * Atividade de um dia = abriu o miniapp (sessão), registrou treino ou entrou naquele dia.
 * Sessões e mensagens com "abriu depois" só existem a partir de quando as métricas começaram.
 */

const H = 3600_000;
const CUSTO_FOTO_USD = 0.0115;
const NOMES_MSG: Record<string, string> = {
  "boas-vindas": "Boas-vindas", treino: "Treino registrado", strava: "Chegou do Strava", "17h": "Resumo das 17h",
  cutucada: "Cutucada", domingo: "Pódio de domingo", "link-strava": "Link do Strava", "subiu-faixa": "Subiu de faixa",
};

const dia = (iso: string) => diaSP(new Date(iso));
function somarDias(d: string, n: number) { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function serie(fim: string, n: number) { return Array.from({ length: n }, (_, i) => somarDias(fim, i - n + 1)); }
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const conta = <T,>(xs: T[], f: (x: T) => string) => xs.reduce<Record<string, number>>((o, x) => { const k = f(x); o[k] = (o[k] || 0) + 1; return o; }, {});

export type Painel = ReturnType<typeof calcularPainel>;

export function calcularPainel(b: Banco, m: Metricas, janela = 30) {
  const hoje = diaSP();
  const dias = serie(hoje, janela);
  const d7 = somarDias(hoje, -6), d30 = somarDias(hoje, -29);
  const us = Object.values(b.usuarios);
  const ts = b.treinos.filter(t => !t.pendenteFoto);
  const inicioMetricas = [m.sessoes[0]?.em, m.envios[0]?.em, m.eventos[0]?.em].filter(Boolean).sort()[0] || "";

  // Atividade por dia: sessão, treino ou entrada.
  const ativos: Record<string, Set<string>> = {};
  const marca = (d: string, uid: string) => { (ativos[d] ||= new Set()).add(uid); };
  m.sessoes.forEach(s => marca(dia(s.em), s.uid));
  b.treinos.forEach(t => marca(dia(t.criadoEm), t.uid));
  us.forEach(u => marca(dia(u.criadoEm), u.id));
  const ativosEntre = (de: string, ate: string) => { const s = new Set<string>(); Object.entries(ativos).forEach(([d, x]) => { if (d >= de && d <= ate) x.forEach(u => s.add(u)); }); return s.size; };

  const treinosPor = conta(ts, t => t.uid);
  const manuais = ts.filter(t => t.fonte === "manual"), strava = ts.filter(t => t.fonte === "strava" || !!t.externoId);
  const comTreino = us.filter(u => treinosPor[u.id]);
  const emGrupo = new Set(b.grupos.flatMap(g => g.membros));
  const deuTp = new Set(b.tapagos.map(t => t.de));
  const voltou = us.filter(u => Object.entries(ativos).some(([d, x]) => d !== dia(u.criadoEm) && x.has(u.id)));

  // ── Visão geral
  const geral = {
    pessoas: us.length, novasHoje: us.filter(u => dia(u.criadoEm) === hoje).length, novas7: us.filter(u => dia(u.criadoEm) >= d7).length,
    novas30: us.filter(u => dia(u.criadoEm) >= d30).length,
    dau: ativos[hoje]?.size || 0, wau: ativosEntre(d7, hoje), mau: ativosEntre(d30, hoje),
    treinaram: comTreino.length, ativacao: pct(comTreino.length, us.length),
    treinos: ts.length, treinosHoje: ts.filter(t => t.dia === hoje).length, treinos7: ts.filter(t => t.dia >= d7).length,
    manuais: manuais.length, viaStrava: strava.length, treinosPorPessoa: comTreino.length ? Math.round((ts.length / comTreino.length) * 10) / 10 : 0,
    minutos: ts.reduce((a, t) => a + t.min, 0), km: Math.round(ts.reduce((a, t) => a + (t.distanciaM || 0), 0) / 1000),
    sessoes: m.sessoes.length, sessoes7: m.sessoes.filter(s => dia(s.em) >= d7).length,
    stravaConectados: us.filter(u => u.strava).length, grupos: b.grupos.length,
  };

  // ── Séries diárias
  const porDia = dias.map(d => ({
    dia: d,
    novas: us.filter(u => dia(u.criadoEm) === d).length,
    ativos: ativos[d]?.size || 0,
    treinos: ts.filter(t => t.dia === d).length,
    manuais: manuais.filter(t => t.dia === d).length,
    strava: strava.filter(t => t.dia === d).length,
    sessoes: m.sessoes.filter(s => dia(s.em) === d).length,
    mensagens: todosEnvios(b, m).filter(e => dia(e.em) === d).length,
  }));
  let acum = us.filter(u => dia(u.criadoEm) < dias[0]).length;
  const acumulado = porDia.map(p => ({ dia: p.dia, total: (acum += p.novas) }));

  // ── Funil (todo mundo que já entrou)
  const funil = [
    { etapa: "Entraram no miniapp", n: us.length },
    { etapa: "Voltaram outro dia", n: voltou.length },
    { etapa: "Registraram o 1º treino", n: comTreino.length },
    { etapa: "3 treinos ou mais", n: us.filter(u => (treinosPor[u.id] || 0) >= 3).length },
    { etapa: "Estão num grupo", n: us.filter(u => emGrupo.has(u.id)).length },
    { etapa: "Conectaram o Strava", n: geral.stravaConectados },
  ].map(f => ({ ...f, pct: pct(f.n, us.length) }));

  // ── Retenção por semana de entrada (semana 0 = a da entrada)
  const semanas = [...new Set(us.map(u => segundaDe(dia(u.criadoEm))))].sort().slice(-8);
  const retencao = semanas.map(s => {
    const coorte = us.filter(u => segundaDe(dia(u.criadoEm)) === s);
    const cel = [0, 1, 2, 3, 4].map(k => {
      const ini = somarDias(s, 7 * k), fim = somarDias(ini, 6);
      if (ini > hoje) return null;
      const n = coorte.filter(u => Object.entries(ativos).some(([d, x]) => d >= ini && d <= fim && x.has(u.id))).length;
      return pct(n, coorte.length);
    });
    return { semana: s, pessoas: coorte.length, cel };
  });

  // ── Treinos
  const ia = m.eventos.filter(e => e.tipo === "foto-ia");
  const treinos = {
    porTipo: Object.entries(conta(ts, t => t.tipo)).map(([k, n]) => ({ k: nomeDoTipo(k), n })).sort((a, c) => c.n - a.n),
    porHora: Array.from({ length: 24 }, (_, h) => ({ h, n: ts.filter(t => horaSP(t.inicioEm || t.criadoEm) === h).length })),
    porSemana: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => ({ d, n: ts.filter(t => new Date(t.dia + "T12:00:00Z").getUTCDay() === i).length })),
    minMedio: ts.length ? Math.round(geral.minutos / ts.length) : 0,
    pendentesFoto: b.treinos.filter(t => t.pendenteFoto).length,
    validacao: conta(b.treinos.filter(t => t.validacao), t => t.validacao!.status),
    ia: { conferidas: ia.length, ok: ia.filter(e => e.status === "ok").length, duvida: ia.filter(e => e.status === "duvida").length,
      recusadas: ia.filter(e => e.status === "recusada").length, custoUsd: Math.round(ia.length * CUSTO_FOTO_USD * 100) / 100 },
    visibilidade: { geral: ts.filter(t => !t.visivel || t.visivel.geral !== false).length, soGrupos: ts.filter(t => t.visivel && t.visivel.geral === false).length },
  };

  // ── Strava
  const ev = (tipo: string) => m.eventos.filter(e => e.tipo === tipo);
  const tentaram = new Set(ev("strava-tentou").map(e => e.uid));
  const conectaramEv = new Set(ev("strava-conectou").map(e => e.uid));
  const stravaInfo = {
    conectados: geral.stravaConectados, pctPessoas: pct(geral.stravaConectados, us.length),
    tentativas: ev("strava-tentou").length, pessoasTentaram: tentaram.size,
    pelaPagina: ev("strava-tentou").filter(e => e.status === "navegador").length,
    conectaramDepoisDeTentar: [...tentaram].filter(u => conectaramEv.has(u)).length,
    desconectaram: ev("strava-desconectou").length,
    treinos: strava.length, treinos7: strava.filter(t => t.dia >= d7).length, comFotoNoApp: strava.filter(t => t.fotoKey).length,
    lancadosAMao: b.treinos.filter(t => t.externoId && t.pendenteFoto).length,
    pctTreinos: pct(strava.length, ts.length),
  };

  // ── Social
  const social = {
    tapagos: b.tapagos.length, tapagos7: b.tapagos.filter(t => t.dia >= d7).length, pessoasDeram: deuTp.size,
    cutucadas: b.cutucadas.length, cutucadasChat: b.cutucadas.filter(c => c.chat === "enviado").length,
    cutucadosTreinaram: b.cutucadas.filter(c => b.treinos.some(t => t.uid === c.para && t.dia === c.dia && t.criadoEm > c.em)).length,
    convites: b.convites.length, convitesAceitos: b.convites.filter(c => c.status === "aceito").length,
    vitorias: b.vitorias.length, perfisFechados: us.filter(u => u.perfilPublico === false).length, foraDoGeral: us.filter(u => u.aparecer === false).length,
  };

  // ── Chat (bot do canal)
  const envios = todosEnvios(b, m);
  const lidas = new Set(m.statusBot.filter(s => s.status === "READ").map(s => s.id));
  const entregues = new Set(m.statusBot.filter(s => s.status === "DELIVERED" || s.status === "READ").map(s => s.id));
  const sessoesDe = conta(m.sessoes, s => s.uid);
  const abriuDepois = (e: EnvioReg, horas: number) => !!sessoesDe[e.uid] && m.sessoes.some(s => s.uid === e.uid && s.em > e.em && Date.parse(s.em) - Date.parse(e.em) <= horas * H);
  const treinouDepois = (e: EnvioReg) => b.treinos.some(t => t.uid === e.uid && t.criadoEm > e.em && Date.parse(t.criadoEm) - Date.parse(e.em) <= 24 * H);
  const medidos = inicioMetricas ? envios.filter(e => e.em >= inicioMetricas) : [];
  const linhaChat = (lista: EnvioReg[]) => {
    const ok = lista.filter(e => !/FAIL|falhou/i.test(e.status));
    return {
      enviadas: lista.length, falharam: lista.length - ok.length, pessoas: new Set(lista.map(e => e.uid)).size,
      entregues: lista.filter(e => e.msgId && entregues.has(e.msgId)).length, lidas: lista.filter(e => e.msgId && lidas.has(e.msgId)).length,
      abriram2h: lista.filter(e => abriuDepois(e, 2)).length, abriram24h: lista.filter(e => abriuDepois(e, 24)).length,
      treinaram24h: lista.filter(treinouDepois).length,
    };
  };
  const tiposMsg = [...new Set(envios.map(e => e.tipo))];
  const chat = {
    inicioMetricas,
    alcancaveis: us.filter(u => u.telefone && u.avisos !== false).length, comTelefone: us.filter(u => u.telefone).length,
    desligaram: us.filter(u => u.avisos === false).length,
    total: linhaChat(envios), medidos: linhaChat(medidos),
    porTipo: tiposMsg.map(t => ({ tipo: t, nome: NOMES_MSG[t] || t, ...linhaChat(medidos.filter(e => e.tipo === t)), enviadasTotal: envios.filter(e => e.tipo === t).length }))
      .sort((a, c) => c.enviadasTotal - a.enviadasTotal),
    status: Object.entries(conta(envios, e => e.status)).map(([k, n]) => ({ k, n })).sort((a, c) => c.n - a.n),
    erros: Object.entries(conta(envios.filter(e => e.erro), e => String(e.erro).slice(0, 80))).map(([k, n]) => ({ k, n })).sort((a, c) => c.n - a.n).slice(0, 8),
    statusBotRecebidos: m.statusBot.length,
    ultimas: envios.slice(-25).reverse().map(e => ({ ...e, nome: b.usuarios[e.uid]?.nome || "?", abriu: abriuDepois(e, 24), treinou: treinouDepois(e) })),
  };

  // ── Grupos
  const grupos = b.grupos.map(g => {
    const tg = ts.filter(t => g.membros.includes(t.uid) && t.criadoEm >= g.criadoEm);
    return { nome: g.nome, membros: g.membros.length, metrica: g.metrica || "duracao", criadoEm: g.criadoEm, dono: b.usuarios[g.criador]?.nome || "?",
      treinos: tg.length, treinos7: tg.filter(t => t.dia >= d7).length, ativos7: new Set(tg.filter(t => t.dia >= d7).map(t => t.uid)).size, desafio: g.fim ? `${g.inicio || "…"} → ${g.fim}` : "" };
  }).sort((a, c) => c.membros - a.membros);

  // ── Pessoas
  const pessoas = us.map(u => pessoa(u, b, m, ts)).sort((a, c) => (c.ultimo || "").localeCompare(a.ultimo || ""));

  return { hoje, janela, inicioMetricas, geral, porDia, acumulado, funil, retencao, treinos, strava: stravaInfo, social, chat, grupos, pessoas };
}

function horaSP(iso: string) { return (new Date(iso).getUTCHours() + 21) % 24; }

/** Mensagens das métricas + o histórico antigo guardado em cada pessoa (antes das métricas existirem). */
function todosEnvios(b: Banco, m: Metricas): EnvioReg[] {
  const inicio = m.envios[0]?.em || "9999";
  const antigos: EnvioReg[] = Object.values(b.usuarios).flatMap(u => (u.mensagens || []).filter(x => x.em < inicio)
    .map(x => ({ uid: u.id, tipo: x.tipo.startsWith("domingo") ? "domingo" : x.tipo, em: x.em, status: x.status, erro: x.erro })));
  return [...antigos, ...m.envios].sort((a, c) => a.em.localeCompare(c.em));
}

function pessoa(u: Usuario, b: Banco, m: Metricas, ts: Treino[]) {
  const meus = ts.filter(t => t.uid === u.id);
  const porDia = new Map<string, Treino[]>();
  meus.forEach(t => porDia.set(t.dia, [...(porDia.get(t.dia) || []), t]));
  const ultTreino = meus.map(t => t.criadoEm).sort().pop() || "";
  return {
    id: u.id, nome: u.nome, entrou: u.criadoEm, ultimo: [m.ultimo[u.id], ultTreino, u.criadoEm].filter(Boolean).sort().pop() || "",
    sessoes: m.sessoes.filter(s => s.uid === u.id).length, treinos: meus.length, strava: !!u.strava,
    pontos: [...porDia.values()].reduce((a, l) => a + pontosDoDia(l), 0),
    grupos: b.grupos.filter(g => g.membros.includes(u.id)).length, avisos: !!u.telefone && u.avisos !== false,
    publico: u.perfilPublico !== false, geral: u.aparecer !== false, tapagos: b.tapagos.filter(t => t.para === u.id).length,
  };
}
