import { lerBanco, alterarBanco, type Treino, type Usuario } from "./store";
import { enviarImagem, enviarTexto, type Envio } from "./bot";
import { pontosDoDia, rankingDoDia, rankingPor, sequencia } from "./ranking";
import { diaSP, nomeDoTipo } from "./tipos";
import { urlArte, urlFoto, urlPodio } from "./mini-sessao";
import { fecharSemana, podioDe } from "./domingo";
import { segundaDe } from "./tipos";
import { registrarEnvio } from "./metricas";
import { textoDe } from "./regua";
import { FAIXAS, faixaDe, nivelDe, RECOMPENSAS, xpDe, xpDoNivel } from "./niveis";
import { lerMetricas } from "./metricas";
import { concederConquistas } from "./conquistas-acoes";
import { urlConquista } from "./mini-sessao";
import { lerCampanhas, type Conquista } from "./campanhas";
import { urlNivel } from "./mini-sessao";

/**
 * O que o Tá Pago! fala no chat, e quando.
 *   · boas-vindas — na primeira vez que a pessoa tem telefone ligado
 *   · treino      — cada treino registrado (foto + resumo)
 *   · strava      — cada treino que chega do Strava (arte + pontos + "abre o miniapp")
 *   · 17h         — "Parabéns pelo dia" ou "Ainda dá tempo", com a colocação
 *   · cutucada    — alguém te chamou pra treinar
 *   · domingo     — pódio da semana de cada grupo seu e do geral
 * Só fala com quem tem telefone e não desligou os avisos.
 */

const ORIGEM = "https://phizchat-tapago.vercel.app";
const primeiro = (n: string) => (n || "").split(" ")[0] || "atleta";
const pode = (u?: Usuario) => !!(u && u.telefone && u.avisos !== false);

/**
 * Beta: o telefone vem de uma lista PhizID→telefone (TAPAGO_TELEFONES =
 * "<PhizID>=+55…;<PhizID>=+55…"). Quando a troca do login/telefone da
 * PhizClip estiver ligada, o telefone vem verificado e esta lista some.
 */
export function telefoneDaLista(phizId?: string): string | undefined {
  if (!phizId) return undefined;
  for (const par of (process.env.TAPAGO_TELEFONES || "").split(";")) {
    const [id, tel] = par.split("=").map(s => s.trim());
    if (id === phizId && /^\+\d{10,15}$/.test(tel || "")) return tel;
  }
  return undefined;
}

async function registrar(uid: string, tipo: string, r: Envio) {
  await registrarEnvio({ uid, tipo: tipo.startsWith("domingo") ? "domingo" : tipo, em: new Date().toISOString(), status: r.status || (r.ok ? "ok" : "falhou"), erro: r.erro, msgId: r.msgId });
  await alterarBanco(b => {
    const u = b.usuarios[uid];
    if (!u) return;
    u.mensagens = [{ tipo, em: new Date().toISOString(), status: r.status || (r.ok ? "ok" : "falhou"), erro: r.erro }, ...(u.mensagens || [])].slice(0, 30);
  }).catch(() => {});
}

export async function boasVindas(u: Usuario) {
  if (!pode(u)) return;
  const txt = await textoDe("boas-vindas", { nome: primeiro(u.nome) });
  if (!txt) return;
  const r = await enviarTexto(u.telefone!, txt);
  await registrar(u.id, "boas-vindas", r);
}

export async function avisarTreino(uid: string, t: Treino) {
  const b = await lerBanco();
  const u = b.usuarios[uid];
  if (!pode(u)) return;
  const hoje = rankingDoDia(b, t.dia, uid);
  const pos = hoje.findIndex(r => r.uid === uid) + 1;
  const eu = hoje.find(r => r.uid === uid);
  const legenda = await textoDe("treino", { nome: primeiro(u!.nome), tipo: nomeDoTipo(t.tipo), min: t.min, min_dia: eu?.min || t.min, pos, total: hoje.length });
  if (!legenda) return;
  const r = t.fotoKey ? await enviarImagem(u!.telefone!, urlFoto(ORIGEM, t.fotoKey), legenda) : await enviarTexto(u!.telefone!, legenda);
  await registrar(uid, "treino", r);
  await avisarFaixa(uid, t).catch(e => console.error("[faixa]", e));
}

/** Depois de um treino: se ele levou a pessoa pra uma faixa nova, manda a arte do nível no chat. */
export async function avisarFaixa(uid: string, t: Treino) {
  const b = await lerBanco();
  const u = b.usuarios[uid];
  if (!pode(u) || t.pendenteFoto) return;
  const antes = nivelDe(xpDe(b, uid, t.id)).nivel, depois = nivelDe(xpDe(b, uid)).nivel;
  if (faixaDe(antes).id === faixaDe(depois).id) return;
  const f = faixaDe(depois);
  const novas = RECOMPENSAS.filter(x => x.nivel > antes && x.nivel <= depois);
  const txt = await textoDe("subiu-faixa", { nome: primeiro(u!.nome), faixa: f.nome, nivel: depois,
    destrave: novas.length ? `\n\nDestravou: ${novas.map(x => x.nome).join(", ")}.` : "" });
  if (!txt) return;
  const r = await enviarImagem(u!.telefone!, urlNivel(ORIGEM, uid, depois), txt).catch(() => null);
  const final = r && r.ok ? r : await enviarTexto(u!.telefone!, txt);
  await registrar(uid, "subiu-faixa", final);
}

const EMOJI: Record<string, string> = { corrida: "🏃", caminhada: "🚶", bike: "🚴", natacao: "🏊", muscu: "🏋️", yoga: "🧘", futebol: "⚽", luta: "🥊", funcional: "💪" };

/** Treino que chegou do Strava: a arte do treino + os pontos, e o convite pra abrir o miniapp. */
export async function avisarStrava(uid: string, t: Treino) {
  const b = await lerBanco();
  const u = b.usuarios[uid];
  if (!pode(u)) return;
  const km = t.distanciaM ? ` · ${String(Math.round(t.distanciaM / 100) / 10).replace(".", ",")} km` : "";
  const base = { nome: primeiro(u!.nome), emoji: EMOJI[t.tipo] || "💪", titulo: t.tituloProprio || t.titulo || nomeDoTipo(t.tipo), min: t.min, km };
  let txt: string | null;
  if (t.pendenteFoto) {
    txt = await textoDe("strava-foto", base);
  } else {
    const pts = pontosDoDia(b.treinos.filter(x => x.uid === uid && x.dia === t.dia && !x.pendenteFoto));
    const geral = rankingPor(b, uid, t.dia, "semana", "pontos", null);
    const pos = geral.findIndex(r => r.uid === uid) + 1;
    txt = await textoDe("strava", { ...base, pts, posicao: pos ? ` e está em ${pos}º de ${geral.length} na semana.` : "." });
  }
  if (!txt) return;
  const r = await enviarImagem(u!.telefone!, urlArte(ORIGEM, t.id), txt).catch(() => null);
  const final = r && r.ok ? r : await enviarTexto(u!.telefone!, txt);
  await registrar(uid, "strava", final);
  await avisarFaixa(uid, t).catch(e => console.error("[faixa]", e));
}

/**
 * Plano B do Strava: o web-view do miniapp às vezes não abre o login do Strava. O link no chat abre no
 * navegador do PhizChat, que não tem a trava de domínio do miniapp. Devolve false se não deu pra mandar.
 */
export async function mandarLinkStrava(uid: string, url: string): Promise<boolean> {
  const u = (await lerBanco()).usuarios[uid];
  if (!u?.telefone) return false; // aqui vale mesmo com avisos desligados: foi a pessoa que pediu
  const txt = await textoDe("link-strava", { nome: primeiro(u.nome), link: url });
  if (!txt) return false;
  const r = await enviarTexto(u.telefone, txt).catch(() => null);
  if (r) await registrar(uid, "link-strava", r);
  return !!r?.ok;
}


/** Cutucada: manda no chat de quem foi cutucado. Devolve o status do envio. */
export async function avisarCutucada(de: string, para: string): Promise<string> {
  const b = await lerBanco();
  const u = b.usuarios[para], q = b.usuarios[de];
  if (!pode(u) || !q) return "sem-telefone";
  const txt = await textoDe("cutucada", { nome: primeiro(u!.nome), quem: primeiro(q.nome) });
  if (!txt) return "desligada";
  const r = await enviarTexto(u!.telefone!, txt);
  await registrar(para, "cutucada", r);
  return r.ok ? "enviado" : (r.status || "falhou");
}

/** O resumo das 17h, pra cada pessoa. */
export async function resumoDas17h(): Promise<{ enviados: number; pulados: number; falhas: number }> {
  const b = await lerBanco();
  const dia = diaSP();
  let enviados = 0, pulados = 0, falhas = 0;
  for (const u of Object.values(b.usuarios)) {
    if (!pode(u)) { pulados++; continue; }
    if ((u.mensagens || []).some(m => m.tipo === "17h" && m.em.startsWith(dia) )) { pulados++; continue; }
    const lista = rankingDoDia(b, dia, u.id);
    const pos = lista.findIndex(r => r.uid === u.id) + 1;
    const eu = lista.find(r => r.uid === u.id);
    const seq = sequencia(b, u.id, dia);
    const top = lista.filter(r => r.min > 0).slice(0, 3).map((r, i) => `${["🥇", "🥈", "🥉"][i]} ${r.uid === u.id ? "Você" : primeiro(r.nome)} · ${r.min} min`).join("\n");
    let txt: string | null;
    if (eu && eu.min > 0) {
      txt = await textoDe("17h-treinou", { nome: primeiro(u.nome), min: eu.min, pos, total: lista.length,
        sequencia: seq > 1 ? ` São ${seq} dias seguidos.` : "", top3: top ? `\n\n${top}` : "" });
    } else {
      const alvo = lista.filter(r => r.min > 0).slice(-1)[0];
      txt = await textoDe("17h-falta", { nome: primeiro(u.nome), pos, total: lista.length,
        alvo: alvo ? ` ${Math.max(10, alvo.min + 1)} min já te colocam na frente de ${primeiro(alvo.nome)}.` : " Ninguém treinou ainda: o 1º lugar é seu.",
        sequencia: seq > 0 ? `\n\nNão deixa a sequência de ${seq} ${seq === 1 ? "dia" : "dias"} quebrar.` : "", top3: top ? `\n\n${top}` : "" });
    }
    if (!txt) { pulados++; continue; }
    const r = await enviarTexto(u.telefone!, txt);
    await registrar(u.id, "17h", r);
    if (r.ok) enviados++; else falhas++;
  }
  return { enviados, pulados, falhas };
}

/** Domingo, 20h: o pódio da semana de cada grupo da pessoa (com 2+ pessoas) e do geral. */
export async function resumoDeDomingo(so?: string): Promise<{ enviados: number; pulados: number; falhas: number }> {
  // Fecha a semana (guarda os campeões) antes de avisar: a comemoração no app depende disso.
  if (!so) await fecharSemana(segundaDe(diaSP()));
  const b = await lerBanco();
  const dia = diaSP();
  let enviados = 0, pulados = 0, falhas = 0;
  for (const u of Object.values(b.usuarios)) {
    if (so && u.id !== so) continue;
    if (!pode(u)) { pulados++; continue; }
    const chaves = b.grupos.filter(g => g.membros.includes(u.id) && g.membros.length >= 2).slice(0, 4).map(g => g.id);
    if (u.aparecer) chaves.push("geral");
    for (const chave of chaves) {
      const tipo = "domingo:" + chave;
      if (!so && (u.mensagens || []).some(m => m.tipo === tipo && m.em.slice(0, 10) === new Date().toISOString().slice(0, 10))) { pulados++; continue; }
      const p = podioDe(b, chave, u.id, dia);
      if (!p || !p.top.length) { pulados++; continue; }
      const med = ["🥇", "🥈", "🥉"];
      const linhas = p.top.map((t, i) => `${med[i]} ${t.eu ? "Você" : primeiro(t.nome)} · ${t.valor} ${t.un}`).join("\n");
      const campeao = p.top[0].eu ? "E o campeão é você! 👑" : `${primeiro(p.top[0].nome)} levou a semana.`;
      const minha = p.eu && !p.top[0].eu ? `\n\nVocê ficou em ${p.eu.pos}º de ${p.eu.total}. Semana que vem tem revanche 💪` : "\n\nSegura o trono na semana que vem 🔥";
      const txt = await textoDe(chave === "geral" ? "domingo-geral" : "domingo-grupo", { nome: primeiro(u.nome), titulo: p.titulo, podio: linhas, campeao, minha });
      if (!txt) { pulados++; continue; }
      const r = await enviarImagem(u.telefone!, urlPodio(ORIGEM, chave, u.id), txt).catch(() => null);
      const final = r && r.ok ? r : await enviarTexto(u.telefone!, txt);
      await registrar(u.id, tipo, final);
      if (final.ok) enviados++; else falhas++;
    }
  }
  return { enviados, pulados, falhas };
}

/* ── Régua agendada: quase na próxima faixa (9h), 3 dias sem treinar (18h), 7 dias sem abrir (12h) ── */

type Resultado = { enviados: number; pulados: number; falhas: number; seco?: string[] };
/** Até quantos pontos ainda conta como "falta só um treino" (um treino comum dá 15–30). */
const UM_TREINO = 30;
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate + "T12:00:00Z") - Date.parse(de + "T12:00:00Z")) / 86400000);

async function marcar(uid: string, passo: string, marca: string) {
  await alterarBanco(b => { const u = b.usuarios[uid]; if (u) u.regua = { ...(u.regua || {}), [passo]: marca }; }).catch(() => {});
}

/** Quem está a um treino de virar a próxima faixa: avisa uma vez por faixa. */
export async function quaseNaFaixa(so?: string, seco = false): Promise<Resultado> {
  const previa: string[] = [];
  const b = await lerBanco();
  let enviados = 0, pulados = 0, falhas = 0;
  for (const u of Object.values(b.usuarios)) {
    if (so && u.id !== so) continue;
    // No teste (seco) conta todo mundo, como se já tivesse telefone: mostra o alcance depois da planilha.
    if (!seco && !pode(u)) { pulados++; continue; }
    const xp = xpDe(b, u.id), n = nivelDe(xp).nivel;
    const prox = FAIXAS.find(f => f.de > n);
    const falta = prox ? xpDoNivel(prox.de) - xp : 0;
    if (!prox || falta <= 0 || falta > UM_TREINO || u.regua?.["quase-faixa"] === prox.id) { pulados++; continue; }
    const txt = await textoDe("quase-faixa", { nome: primeiro(u.nome), faixa: prox.nome, falta, nivel: prox.de });
    if (!txt) { pulados++; continue; }
    if (seco) { previa.push(txt); enviados++; continue; }
    const r = await enviarTexto(u.telefone!, txt);
    await registrar(u.id, "quase-faixa", r);
    if (r.ok) { enviados++; await marcar(u.id, "quase-faixa", prox.id); } else falhas++;
  }
  return { enviados, pulados, falhas, ...(seco ? { seco: previa } : {}) };
}

/** Já treinou antes e hoje faz 3 dias do último treino: um empurrão por pausa. */
export async function tresDiasSemTreino(so?: string, seco = false): Promise<Resultado> {
  const previa: string[] = [];
  const b = await lerBanco();
  const dia = diaSP();
  let enviados = 0, pulados = 0, falhas = 0;
  for (const u of Object.values(b.usuarios)) {
    if (so && u.id !== so) continue;
    // No teste (seco) conta todo mundo, como se já tivesse telefone: mostra o alcance depois da planilha.
    if (!seco && !pode(u)) { pulados++; continue; }
    const ultimo = b.treinos.filter(t => t.uid === u.id && !t.pendenteFoto).map(t => t.dia).sort().pop();
    if (!ultimo || diasEntre(ultimo, dia) !== 3 || u.regua?.["3-dias"] === ultimo) { pulados++; continue; }
    const txt = await textoDe("3-dias", { nome: primeiro(u.nome), dias: 3 });
    if (!txt) { pulados++; continue; }
    if (seco) { previa.push(txt); enviados++; continue; }
    const r = await enviarTexto(u.telefone!, txt);
    await registrar(u.id, "3-dias", r);
    if (r.ok) { enviados++; await marcar(u.id, "3-dias", ultimo); } else falhas++;
  }
  return { enviados, pulados, falhas, ...(seco ? { seco: previa } : {}) };
}

/** Não abre o miniapp há 7 dias ou mais: chama de volta uma vez por sumiço. */
export async function seteDiasSemAbrir(so?: string, seco = false): Promise<Resultado> {
  const previa: string[] = [];
  const [b, m] = await Promise.all([lerBanco(), lerMetricas()]);
  const dia = diaSP();
  let enviados = 0, pulados = 0, falhas = 0;
  const geral = rankingPor(b, "", dia, "total", "pontos", null);
  const inicioMetricas = m.sessoes[0]?.em || new Date().toISOString();
  for (const u of Object.values(b.usuarios)) {
    if (so && u.id !== so) continue;
    // No teste (seco) conta todo mundo, como se já tivesse telefone: mostra o alcance depois da planilha.
    if (!seco && !pode(u)) { pulados++; continue; }
    // Última abertura; quem não abriu desde que as métricas começaram usa o mais recente entre
    // o início das métricas, a criação da conta e o último treino (sumiu pelo menos desde então).
    const ultTreino = b.treinos.filter(t => t.uid === u.id).reduce((a, t) => (t.criadoEm > a ? t.criadoEm : a), "");
    const aberto = m.ultimo[u.id] || [inicioMetricas, u.criadoEm || "", ultTreino].sort().pop() || "";
    if (!aberto || Date.now() - Date.parse(aberto) < 7 * 86400000 || u.regua?.["7-dias"] === aberto.slice(0, 10)) { pulados++; continue; }
    const pos = geral.findIndex(r => r.uid === u.id) + 1;
    const txt = await textoDe("7-dias", { nome: primeiro(u.nome), pos: pos || "", total: geral.length });
    // Fora do ranking geral, a frase da posição não faz sentido: tira a linha.
    const final = txt && !pos ? txt.split("\n").filter(l => !l.includes("º no geral")).join("\n").trim() : txt;
    if (!final) { pulados++; continue; }
    if (seco) { previa.push(final); enviados++; continue; }
    const r = await enviarTexto(u.telefone!, final);
    await registrar(u.id, "7-dias", r);
    if (r.ok) { enviados++; await marcar(u.id, "7-dias", aberto.slice(0, 10)); } else falhas++;
  }
  return { enviados, pulados, falhas, ...(seco ? { seco: previa } : {}) };
}

/* ── Conquistas e campanhas no chat ── */

/** Depois de um treino: dá as conquistas cumpridas e avisa no chat com a arte do badge. */
export async function avisarConquistas(uid: string) {
  const novas = await concederConquistas(uid);
  if (!novas.length) return;
  const b = await lerBanco();
  const u = b.usuarios[uid];
  if (!pode(u)) return;
  for (const c of novas) {
    const txt = await textoDe("conquista-ganhou", { nome: primeiro(u!.nome), conquista: c.nome, descricao: c.descricao });
    if (!txt) continue;
    const r = await enviarImagem(u!.telefone!, urlConquista(ORIGEM, uid, c.id), txt).catch(() => null);
    const final = r && r.ok ? r : await enviarTexto(u!.telefone!, txt);
    await registrar(uid, "conquista", final);
  }
}

/** Conquistas de treino que valem hoje (campanha do dia, ex.: Halloween). */
async function campanhasDeHoje(dia: string): Promise<Conquista[]> {
  const { conquistas } = await lerCampanhas();
  return conquistas.filter(c => c.ativa && c.regra.tipo === "treino" && dia >= c.regra.inicio && dia <= c.regra.fim);
}

/**
 * Lembrete da campanha (9h) e última chamada (20h) pra quem ainda não ganhou o badge do dia.
 * `qual` = "lembrete" | "ultima". Uma vez por campanha e por tipo.
 */
export async function lembrarCampanha(qual: "lembrete" | "ultima", so?: string, seco = false): Promise<Resultado> {
  const dia = diaSP();
  const hoje = await campanhasDeHoje(dia);
  const b = await lerBanco();
  let enviados = 0, pulados = 0, falhas = 0;
  const previa: string[] = [];
  for (const c of hoje) for (const u of Object.values(b.usuarios)) {
    if (so && u.id !== so) continue;
    if (!seco && !pode(u)) { pulados++; continue; }
    const marca = `${qual}:${c.id}`;
    if ((u.conquistas || []).some(x => x.id === c.id) || u.regua?.["campanha"] === marca || u.regua?.["campanha-" + qual] === c.id) { pulados++; continue; }
    const vars = { nome: primeiro(u.nome), conquista: c.nome, descricao: c.descricao };
    // Lembrete da manhã: a mensagem própria da campanha (admin), se tiver; senão o texto da régua. Desligar na régua para os dois.
    const base = await textoDe(qual === "lembrete" ? "campanha-lembrete" : "campanha-ultima", vars);
    const txt = base && qual === "lembrete" && c.mensagem ? c.mensagem.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k as keyof typeof vars] ?? "")) : base;
    if (!txt) { pulados++; continue; }
    if (seco) { previa.push(txt); enviados++; continue; }
    const r = await enviarImagem(u.telefone!, (c.imagem.startsWith("http") ? "" : ORIGEM) + c.imagem, txt).catch(() => null);
    const final = r && r.ok ? r : await enviarTexto(u.telefone!, txt);
    await registrar(u.id, "campanha", final);
    if (final.ok) { enviados++; await marcar(u.id, "campanha-" + qual, c.id); } else falhas++;
  }
  return { enviados, pulados, falhas, ...(seco ? { seco: previa } : {}) };
}
