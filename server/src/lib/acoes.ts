import { alterarBanco, apagarFoto, lerBanco, publico, salvarFoto, type Banco, type Destaque, type Treino, type Usuario } from "./store";
import { validarFoto } from "./validacao";
import { registrarEvento } from "./metricas";
import { nivelDe, resumoNivel, subidaDeNivel, xpDe } from "./niveis";
import { urlNoStrava } from "./strava";
import { visivelNaGeral } from "./timeline";
import { avisarCutucada } from "./mensagens";
import { dadosCampeao, fecharSemanaPassadaSeFaltar, trofeusDe } from "./domingo";
import { convitesPraMim } from "./grupos";
import { arteCampeao } from "./arte-campeao";
import { diaSP, FOTO_MAX_BYTES, KM_MAX, MANUAL_POR_DIA, MIN_MAX, MIN_MIN, segundaDe, TIPOS, TIPOS_COM_KM, type Metrica, type Periodo } from "./tipos";
import { publicarArte, publicarDestaque } from "./destaques";
import { ehVerificado, pontosDoDia, rankingDoDia, rankingPor, sequencia } from "./ranking";
import { nomeDoTipo } from "./tipos";

/**
 * As regras do Tá Pago!, num lugar só. O site (/api/…) e o miniapp nativo
 * (/api/mini/…) chamam estas funções — nenhuma regra mora numa rota.
 */

export class ErroAcao extends Error {
  /** extra: campos a mais na resposta (ex.: o título engraçado da foto recusada). */
  constructor(msg: string, public status = 400, public extra: Record<string, unknown> = {}) { super(msg); }
}

export const novoId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

export async function painel(uid: string, membros: string[] | null = null, periodo: Periodo = "semana", metrica: Metrica = "pontos") {
  let b = await lerBanco();
  // Token válido mas a pessoa não existe mais (apagou a conta): o app entra de novo do zero.
  if (!b.usuarios[uid]) throw new ErroAcao("Sessão vencida.", 401);
  // Segunda de manhã sem o cron ter rodado: fecha a semana passada aqui mesmo.
  const antes = b.vitorias.length;
  await fecharSemanaPassadaSeFaltar(b);
  if (antes !== (await lerBanco()).vitorias.length) b = await lerBanco();
  const eu = b.usuarios[uid];
  const dia = diaSP();
  // Segunda a domingo: em quais dias a pessoa treinou (pra faixa da semana na home).
  const seg = segundaDe(dia);
  const dias = new Set(b.treinos.filter(t => t.uid === uid).map(t => t.dia));
  const semanaDias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + i);
    return dias.has(d.toISOString().slice(0, 10));
  });
  const hojeIdx = Math.round((Date.parse(dia + "T12:00:00Z") - Date.parse(seg + "T12:00:00Z")) / 86400000);
  // Foto do último treino da pessoa: vira o fundo do cartão do dia.
  const ultimaFotoKey = [...b.treinos].filter(t => t.uid === uid && t.fotoKey).sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))[0]?.fotoKey;
  const treinosSemana = b.treinos.filter(t => t.uid === uid && t.dia >= seg && t.dia <= dia).length;
  return {
    semanaDias, hojeIdx, ultimaFotoKey, treinosSemana,
    eu: publico(eu),
    periodo, metrica,
    stravaNovo: stravaNovo(b, uid),
    cutucadoPor: cutucadoPor(b, uid),
    vitoria: vitoriaNova(b, uid),
    treinaramHoje: treinaramHoje(b, uid),
    convites: convitesPraMim(b, uid),
    euVerificado: ehVerificado(eu),
    ranking: rankingPor(b, uid, dia, periodo, metrica, membros),
    // Meus números de hoje e meus pontos Tá Pago! (sempre, mesmo dentro de um grupo).
    hojeEu: rankingPor(b, uid, dia, "hoje", "pontos", [uid])[0],
    pontosSemana: rankingPor(b, uid, dia, "semana", "pontos", [uid])[0]?.pontos || 0,
    pontosMes: rankingPor(b, uid, dia, "mes", "pontos", [uid])[0]?.pontos || 0,
    seq: sequencia(b, uid, dia),
    // Nível (só pra própria pessoa): o resumo e a comemoração quando subiu.
    nivel: resumoNivel(xpDe(b, uid)),
    subiuNivel: subidaDeNivel(xpDe(b, uid), eu.nivelVisto),
  };
}

/** A pessoa viu a comemoração do nível: guarda pra não repetir. */
export async function marcarNivelVisto(uid: string, nivel: number) {
  await alterarBanco(b => { const u = b.usuarios[uid]; if (u && Number.isFinite(nivel)) u.nivelVisto = Math.floor(nivel); });
}

/** Se a curva ficou mais difícil, o nível já visto pode estar acima do atual: desce pro atual. */
export async function acertarNivelVisto(uid: string) {
  await alterarBanco(b => {
    const u = b.usuarios[uid];
    if (u?.nivelVisto === undefined) return;
    const atual = nivelDe(xpDe(b, uid)).nivel;
    if (u.nivelVisto > atual) u.nivelVisto = atual;
  });
}

/** Treino à mão. Regra do produto: SEM FOTO NÃO ENTRA. */
export async function registrarTreino(uid: string, p: {
  foto: { dados: ArrayBuffer; tipo: string; nome: string } | null;
  tipo: string; min: number; km?: number; w?: number; h?: number;
  visivel?: { geral: boolean; grupos: string[] | "todos" };
}): Promise<Treino> {
  const { foto, tipo } = p;
  const min = Math.round(p.min);
  if (!foto || foto.dados.byteLength === 0) throw new ErroAcao("Treino à mão precisa de foto.");
  if (!/^image\/(jpeg|png|webp)$/.test(foto.tipo)) throw new ErroAcao("A foto precisa ser JPG, PNG ou WebP.");
  if (foto.dados.byteLength > FOTO_MAX_BYTES) throw new ErroAcao("Foto grande demais (máx. 10 MB).");
  if (!TIPOS.some(t => t[0] === tipo)) throw new ErroAcao("Escolha o tipo de treino.");
  if (!(min >= MIN_MIN && min <= MIN_MAX)) throw new ErroAcao(`Tempo entre ${MIN_MIN} e ${MIN_MAX} min.`);
  const km = TIPOS_COM_KM.includes(tipo) && p.km ? Math.round(Number(p.km) * 10) / 10 : 0;
  if (km && !(km >= 0.5 && km <= KM_MAX)) throw new ErroAcao(`Distância entre 0,5 e ${KM_MAX} km.`);

  const b0 = await lerBanco();
  const u = b0.usuarios[uid];
  if (!u) throw new ErroAcao("Usuário não encontrado.", 404);

  const dia = diaSP();
  const meus = b0.treinos.filter(t => t.uid === uid && t.fonte === "manual");
  // Não duplicar: se um treino do Strava começou nas últimas 4 h, é o mesmo treino — a foto vai nele.
  const recente = b0.treinos.find(t => t.uid === uid && t.fonte === "strava" && t.inicioEm && Date.now() - Date.parse(t.inicioEm) < 4 * 3600_000);
  if (recente) throw new ErroAcao("Esse treino já entrou pelo Strava 🔥 Quer pôr a foto nele?", 409, { stravaId: recente.id, titulo: recente.tituloProprio || recente.titulo || "" });
  if (meus.filter(t => t.dia === dia).length >= MANUAL_POR_DIA)
    throw new ErroAcao(`Hoje você já registrou ${MANUAL_POR_DIA} treinos com foto. Amanhã tem mais!`);

  // Antifraude: a foto é conferida antes de ser gravada. Recusada não entra.
  const hashesAnteriores = meus.slice(-30).map(t => t.validacao?.hash).filter((h): h is string => !!h);
  const validacao = await validarFoto(foto.dados, { tipo, min, hashesAnteriores });
  await registrarEvento("foto-ia", uid, validacao.status);
  if (validacao.status === "recusada")
    throw new ErroAcao(validacao.motivo || "Essa foto não parece de treino. Tira outra?", 422, { titulo: validacao.titulo || "" });

  const id = novoId();
  const ext = foto.tipo === "image/png" ? "png" : foto.tipo === "image/webp" ? "webp" : "jpg";
  const fotoKey = `tapago/fotos/${uid}/${id}.${ext}`;
  await salvarFoto(fotoKey, foto.dados, foto.tipo);

  const treino: Treino = {
    id, uid, dia, tipo, min, fonte: "manual", fotoKey, validacao, visivel: limparVisivel(p.visivel), distanciaM: km ? Math.round(km * 1000) : undefined,
    fotoW: p.w || undefined, fotoH: p.h || undefined, criadoEm: new Date().toISOString(),
  };
  if (u.destaques) treino.destaque = await publicarDestaque(treino, u, foto);
  await alterarBanco(b => { b.treinos.push(treino); });
  return treino;
}

/** Como a pessoa ficou depois do treino — é o que a tela de parabéns comemora. */
export type ResumoTreino = {
  pos: number; posAntes: number; total: number; minHoje: number; seq: number; treinosHoje: number; primeiroDoDia: boolean;
};

export async function resumoDepois(uid: string, posAntes: number): Promise<ResumoTreino> {
  const b = await lerBanco();
  const dia = diaSP();
  const hoje = rankingDoDia(b, dia, uid);
  const eu = hoje.find(r => r.uid === uid);
  return {
    pos: hoje.findIndex(r => r.uid === uid) + 1, posAntes, total: hoje.length,
    minHoje: eu?.min || 0, seq: sequencia(b, uid, dia), treinosHoje: eu?.treinos || 0, primeiroDoDia: (eu?.treinos || 0) <= 1,
  };
}

export async function posicaoAgora(uid: string): Promise<number> {
  const b = await lerBanco();
  const hoje = rankingDoDia(b, diaSP(), uid);
  return hoje.findIndex(r => r.uid === uid) + 1;
}

/**
 * Postar o treino nos Momentos e/ou nos Clipes (pergunta da tela de parabéns).
 *
 * LIMITE DE HOJE: a OpenAPI de Clipes e Momentos (v1.4) só publica como conta
 * ROBÔ do app, não no perfil da pessoa. Então: Momentos sai pela conta oficial
 * Tá Pago! (com a foto e o nome), e Clipe fica pedido até existir (a) o MP4
 * gerado no servidor e (b) publicação no perfil da própria pessoa.
 * Nada aqui bloqueia: o treino já está no ranking.
 */
export async function publicarTreino(uid: string, treinoId: string, q: { momentos: boolean; clipes: boolean }) {
  const b0 = await lerBanco();
  const t = b0.treinos.find(x => x.id === treinoId && x.uid === uid);
  const u = b0.usuarios[uid];
  if (!t || !u) throw new ErroAcao("Treino não encontrado.", 404);
  const em = new Date().toISOString();
  let momento: Destaque | undefined;
  let clipe: Destaque | undefined;
  if (q.momentos) {
    // Sem foto do app vale a do Strava ou o trajeto (lib/arte-dados.ts).
    momento = await publicarDestaque(t, u);
  }
  // Clipes ficam de fora por enquanto (sem vídeo/Meishe): o pedido é ignorado.
  await alterarBanco(b => {
    const x = b.treinos.find(y => y.id === treinoId);
    if (x) { x.publicar = { momentos: q.momentos, clipes: q.clipes, em, momento, clipe }; x.visto = true; }
  });
  return { momento: momento?.status || null, clipe: clipe?.status || null };
}

/** "Tá pago" pra alguém: uma vez por pessoa por dia. */
export async function darTaPago(uid: string, para: string) {
  if (!para || para === uid) throw new ErroAcao("Inválido.");
  const dia = diaSP();
  const ok = await alterarBanco(b => {
    if (!b.usuarios[para]) return false;
    if (!b.tapagos.some(x => x.de === uid && x.para === para && x.dia === dia))
      b.tapagos.push({ de: uid, para, dia, em: new Date().toISOString() });
    return true;
  });
  if (!ok) throw new ErroAcao("Pessoa não encontrada.", 404);
}

export async function mudarAjustes(uid: string, patch: { aparecer?: boolean; destaques?: boolean; nome?: string; avisos?: boolean; perfilPublico?: boolean }): Promise<Usuario> {
  const u = await alterarBanco(b => {
    const x = b.usuarios[uid];
    if (!x) return null;
    if (typeof patch.perfilPublico === "boolean") x.perfilPublico = patch.perfilPublico;
    if (typeof patch.aparecer === "boolean") x.aparecer = patch.aparecer;
    if (typeof patch.destaques === "boolean") x.destaques = patch.destaques;
    if (typeof patch.avisos === "boolean") x.avisos = patch.avisos;
    if (typeof patch.nome === "string") {
      const n = patch.nome.trim().replace(/\s+/g, " ").slice(0, 40);
      if (n.length >= 2) { x.nome = n; x.nomeProprio = true; }
    }
    return x;
  });
  if (!u) throw new ErroAcao("Usuário não encontrado.", 404);
  return u;
}

export type PerfilPhiz = { nome?: string; avatar?: string; idioma?: string; phizId?: string; usuario?: string; cidade?: string; genero?: number; verificado?: boolean };

const limpaNome = (n?: string) => String(n || "").trim().replace(/\s+/g, " ").slice(0, 40);
const limpaUrl = (u?: string) => (/^https:\/\/[^\s"'<>]{4,500}$/.test(String(u || "")) ? String(u) : undefined);

/**
 * Cria ou atualiza a pessoa com o que o PhizChat entregou no login.
 * Nunca pergunta nada: sem nome do PhizChat, vira "Atleta" (dá pra mudar nos Ajustes).
 * O perfil do PhizChat atualiza nome e foto a cada entrada — a não ser que a
 * pessoa tenha escolhido outro nome.
 */
export async function garantirUsuario(id: string, perfil: PerfilPhiz = {}, chave?: string, segredo?: string): Promise<{ usuario: Usuario; novo: boolean }> {
  const nome = limpaNome(perfil.nome);
  const avatar = limpaUrl(perfil.avatar);
  const idioma = String(perfil.idioma || "").slice(0, 10) || undefined;
  const extra = {
    phizId: String(perfil.phizId || "").replace(/[^\w.-]/g, "").slice(0, 64) || undefined,
    usuario: String(perfil.usuario || "").trim().slice(0, 40) || undefined,
    cidade: String(perfil.cidade || "").trim().slice(0, 60) || undefined,
    genero: [0, 1, 2].includes(Number(perfil.genero)) ? Number(perfil.genero) : undefined,
    // "verificado" que vem do aparelho não vale: só o que o servidor da PhizClip confirmar (login unificado).
  };
  const aplica = (u: Usuario) => { (Object.keys(extra) as (keyof typeof extra)[]).forEach(k => { if (extra[k] !== undefined) (u as Record<string, unknown>)[k] = extra[k]; }); };
  return alterarBanco(b => {
    // Um PhizID é de uma conta só: o perfil vem do aparelho (sem conferência no servidor enquanto o
    // login unificado não está ligado), então quem chegar depois com o mesmo PhizID fica sem ele.
    // Isso impede alguém de "virar" outra pessoa pra herdar telefone (mensagens) e selo.
    if (extra.phizId && Object.values(b.usuarios).some(u => u.id !== id && u.phizId === extra.phizId)) {
      console.warn("[auth] PhizID já usado por outra conta; ignorado para", id);
      extra.phizId = undefined;
    }
    const ja = b.usuarios[id];
    if (ja) {
      if (chave && !ja.chave) ja.chave = chave;
      // Conferido de novo aqui dentro (duas entradas ao mesmo tempo não amarram dois segredos).
      if (segredo && ja.segredo && ja.segredo !== segredo) throw new ErroAcao("Não deu pra entrar.", 401);
      if (segredo && !ja.segredo) ja.segredo = segredo;
      if (nome && !ja.nomeProprio) ja.nome = nome;
      if (avatar) ja.avatar = avatar;
      if (idioma) ja.idioma = idioma;
      aplica(ja);
      if (!ja.nome) ja.nome = "Atleta";
      return { usuario: ja, novo: false };
    }
    const u: Usuario = {
      id, chave, segredo: segredo || undefined, nome: nome || "Atleta", avatar, idioma, criadoEm: new Date().toISOString(), aparecer: true, destaques: false,
    };
    aplica(u);
    b.usuarios[id] = u;
    return { usuario: u, novo: true };
  });
}

/**
 * A página "Eu": todos os meus números e a lista dos meus treinos.
 * Conta só o que vale no ranking (foto recusada nunca é gravada).
 */
export async function minhaPagina(uid: string, quem: string = uid) {
  const b = await lerBanco();
  const u = b.usuarios[uid];
  if (!u) throw new ErroAcao("Usuário não encontrado.", 404);
  const outro = quem !== uid;
  if (outro && u.perfilPublico === false) throw new ErroAcao("Perfil fechado", 403, { privado: true, nome: u.nome.split(" ")[0] });
  const dia = diaSP();
  const meus = b.treinos.filter(t => t.uid === uid).sort((a, c) => c.criadoEm.localeCompare(a.criadoEm));
  const porDia = new Map<string, Treino[]>();
  meus.forEach(t => porDia.set(t.dia, [...(porDia.get(t.dia) || []), t]));
  const um = (periodo: Periodo) => rankingPor(b, uid, dia, periodo, "pontos", [uid])[0];
  // "Todo o tempo": soma direto dos dias.
  const dias = [...porDia.keys()].sort();
  const tudo = dias.reduce((a, d) => {
    const ts = porDia.get(d)!;
    return { pontos: a.pontos + pontosDoDia(ts), min: a.min + ts.reduce((x, t) => x + t.min, 0), km: a.km + ts.reduce((x, t) => x + (t.distanciaM || 0), 0) / 1000 };
  }, { pontos: 0, min: 0, km: 0 });
  // Melhor sequência de dias seguidos.
  let melhor = 0, atual = 0, ant = "";
  for (const d of dias) {
    const seguido = ant && Date.parse(d + "T12:00:00Z") - Date.parse(ant + "T12:00:00Z") === 86400000;
    atual = seguido ? atual + 1 : 1; melhor = Math.max(melhor, atual); ant = d;
  }
  // Calendário: últimas 5 semanas (segunda a domingo), com pontos de cada dia.
  const seg = segundaDe(dia);
  const ini = new Date(seg + "T12:00:00Z"); ini.setUTCDate(ini.getUTCDate() - 28);
  const calendario = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(ini); d.setUTCDate(d.getUTCDate() + i);
    const k = d.toISOString().slice(0, 10);
    return { dia: k, n: d.getUTCDate(), pts: k <= dia ? pontosDoDia(porDia.get(k) || []) : -1, hoje: k === dia };
  });
  // Por tipo, em minutos.
  const tipos = new Map<string, { min: number; n: number }>();
  meus.forEach(t => { const x = tipos.get(t.tipo) || { min: 0, n: 0 }; x.min += t.min; x.n++; tipos.set(t.tipo, x); });
  const geralSemana = rankingPor(b, uid, dia, "semana", "pontos", null);
  const posGeral = geralSemana.findIndex(r => r.uid === uid) + 1;
  return {
    eu: outro ? { id: u.id, nome: u.nome, avatar: u.avatar, verificado: ehVerificado(u) } : publico(u),
    semana: um("semana"), mes: um("mes"),
    tudo: { pontos: tudo.pontos, min: tudo.min, km: Math.round(tudo.km * 10) / 10, treinos: meus.length, dias: dias.length },
    seq: sequencia(b, uid, dia), melhorSeq: melhor, posGeral, totalGeral: geralSemana.length,
    // Grupos são secretos: pros outros, o troféu diz só se foi num grupo ou no geral (nunca qual grupo).
    trofeus: trofeusDe(b, uid).sort((a, c) => c.semana.localeCompare(a.semana)).map(v => ({ titulo: outro ? (v.chave === "geral" ? "Ranking geral" : "Grupo") : v.titulo, semana: v.semana, valor: v.valor, un: v.un })),
    grupos: outro ? undefined : b.grupos.filter(g => g.membros.includes(uid)).length,
    tapagos: outro ? undefined : b.tapagos.filter(x => x.para === uid).length,
    calendario,
    tipos: [...tipos.entries()].map(([k, v]) => ({ tipo: nomeDoTipo(k), ...v })).sort((a, c) => c.min - a.min),
    outro,
    // Nível só no perfil da própria pessoa (é pessoal; os outros não veem).
    // Pros outros vai só o nível e a faixa (a tag embaixo do nome); o progresso é só da própria pessoa.
    ...(outro ? (() => { const r = resumoNivel(xpDe(b, uid)); return { nivelTag: { nivel: r.nivel, faixa: r.faixa } }; })() : { nivel: resumoNivel(xpDe(b, uid)) }),
    // Pros outros: só o que foi pra timeline geral.
    treinos: meus.filter(t => !outro || (visivelNaGeral(b, t, quem) && !t.pendenteFoto)).slice(0, 100).map(t => {
      return {
      id: t.id, dia: t.dia, criadoEm: t.criadoEm, tipo: nomeDoTipo(t.tipo), k: t.tipo, min: t.min,
      km: t.distanciaM ? Math.round(t.distanciaM / 100) / 10 : 0, fonte: t.fonte, titulo: t.tituloProprio || t.titulo || "",
      fotoKey: t.fotoKey, fotoExterna: outro ? undefined : t.fotoExterna, duvida: !outro && t.validacao?.status === "duvida", pendenteFoto: !!t.pendenteFoto, noStrava: outro ? "" : urlNoStrava(t.externoId),
      tp: b.tapagos.filter(x => x.para === uid && x.dia === t.dia).length,
    }; }),
  };
}

/** Apaga um treino meu (e a foto). Treino do Strava volta se a atividade for editada lá. */
export async function apagarTreino(uid: string, id: string) {
  const t = await alterarBanco(b => {
    const x = b.treinos.find(y => y.id === id && y.uid === uid);
    if (x) b.treinos = b.treinos.filter(y => y !== x);
    return x;
  });
  if (!t) throw new ErroAcao("Treino não encontrado.", 404);
  if (t.fotoKey) await apagarFoto(t.fotoKey);
}

/** O treino do Strava mais recente que a pessoa ainda não viu (folha "Chegou do Strava"), dos últimos 3 dias. */
export function stravaNovo(b: Banco, uid: string) {
  const limite = new Date(Date.now() - 3 * 86400000).toISOString();
  const t = b.treinos
    .filter(x => x.uid === uid && x.fonte === "strava" && !x.visto && x.criadoEm >= limite)
    .sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))[0];
  if (!t) return null;
  return {
    id: t.id, titulo: t.tituloProprio || t.titulo || nomeDoTipo(t.tipo), tipo: nomeDoTipo(t.tipo), min: t.min, noStrava: urlNoStrava(t.externoId), visivel: t.visivel || null,
    km: t.distanciaM ? Math.round(t.distanciaM / 100) / 10 : 0, pendenteFoto: !!t.pendenteFoto, temFoto: !!(t.fotoKey || t.fotoExterna),
    pontos: t.pendenteFoto ? 0 : pontosDoDia(b.treinos.filter(x => x.uid === uid && x.dia === t.dia && !x.pendenteFoto)),
  };
}

export async function marcarVisto(uid: string, id: string) {
  await alterarBanco(b => { const t = b.treinos.find(x => x.id === id && x.uid === uid); if (t) t.visto = true; });
}

/** Foto num treino que já existe (o do Strava). Passa pela mesma conferência da IA. */
export async function fotoNoTreino(uid: string, id: string, foto: { dados: ArrayBuffer; tipo: string }) {
  if (!/^image\/(jpeg|png|webp)$/.test(foto.tipo)) throw new ErroAcao("A foto precisa ser JPG, PNG ou WebP.");
  if (foto.dados.byteLength > FOTO_MAX_BYTES) throw new ErroAcao("Foto grande demais (máx. 10 MB).");
  const b0 = await lerBanco();
  const t0 = b0.treinos.find(x => x.id === id && x.uid === uid);
  if (!t0) throw new ErroAcao("Treino não encontrado.", 404);
  const hashes = b0.treinos.filter(x => x.uid === uid && x.validacao?.hash).slice(-30).map(x => x.validacao!.hash!) ;
  const validacao = await validarFoto(foto.dados, { tipo: t0.tipo, min: t0.min, hashesAnteriores: hashes });
  await registrarEvento("foto-ia", uid, validacao.status);
  if (validacao.status === "recusada")
    throw new ErroAcao(validacao.motivo || "Essa foto não parece de treino. Tira outra?", 422, { titulo: validacao.titulo || "" });
  const ext = foto.tipo === "image/png" ? "png" : foto.tipo === "image/webp" ? "webp" : "jpg";
  const fotoKey = `tapago/fotos/${uid}/${id}.${ext}`;
  await salvarFoto(fotoKey, foto.dados, foto.tipo);
  await alterarBanco(b => {
    const t = b.treinos.find(x => x.id === id);
    if (t) { t.fotoKey = fotoKey; t.validacao = validacao; delete t.pendenteFoto; }
  });
  return { valeu: !!t0.pendenteFoto };
}

/** Cutucar alguém pra treinar: só entre quem está no mesmo grupo, uma vez por dia, só em quem ainda não treinou hoje. */
export async function cutucar(uid: string, para: string) {
  if (!para || para === uid) throw new ErroAcao("Inválido.");
  const dia = diaSP();
  const r = await alterarBanco(b => {
    if (!b.usuarios[para]) throw new ErroAcao("Pessoa não encontrada.", 404);
    if (!b.grupos.some(g => g.membros.includes(uid) && g.membros.includes(para))) throw new ErroAcao("Só dá pra cutucar quem está num grupo com você.", 403);
    if (b.treinos.some(t => t.uid === para && t.dia === dia && !t.pendenteFoto)) throw new ErroAcao("Essa pessoa já treinou hoje 🔥");
    if (b.cutucadas.some(x => x.de === uid && x.para === para && x.dia === dia)) return { ja: true };
    b.cutucadas.push({ de: uid, para, dia, em: new Date().toISOString() });
    return { ja: false };
  });
  if (r.ja) return { ja: true, chat: "" };
  const chat = await avisarCutucada(uid, para).catch(() => "falhou");
  await alterarBanco(b => { const c = b.cutucadas.find(x => x.de === uid && x.para === para && x.dia === dia); if (c) c.chat = chat; });
  return { ja: false, chat };
}

/** Quem me cutucou hoje (pra mostrar na home). */
export function cutucadoPor(b: Banco, uid: string): string[] {
  const dia = diaSP();
  return (b.cutucadas || []).filter(x => x.para === uid && x.dia === dia).map(x => (b.usuarios[x.de]?.nome || "").split(" ")[0]).filter(Boolean);
}

/** A vitória mais recente que a pessoa ainda não comemorou, com o total de semanas vencidas. */
export function vitoriaNova(b: Banco, uid: string) {
  const minhas = trofeusDe(b, uid);
  const v = minhas.filter(x => !x.vista).sort((a, c) => c.semana.localeCompare(a.semana))[0];
  if (!v) return null;
  return { id: v.id, titulo: v.titulo, chave: v.chave, valor: v.valor, un: v.un, membros: v.membros, semana: v.semana,
    total: minhas.length, naqui: minhas.filter(x => x.chave === v.chave).length };
}

export async function marcarVitoriaVista(uid: string, id: string) {
  await alterarBanco(b => { b.vitorias.filter(v => v.uid === uid && (v.id === id || !id)).forEach(v => { v.vista = true; }); });
}

/** Posta a arte do campeão nos Momentos (conta Tá Pago!). */
export async function publicarCampeao(uid: string, vitoriaId: string) {
  const b = await lerBanco();
  const v = b.vitorias.find(x => x.id === vitoriaId && x.uid === uid);
  const d = dadosCampeao(b, vitoriaId);
  if (!v || !d) throw new ErroAcao("Vitória não encontrada.", 404);
  const png = Buffer.from(await (await arteCampeao(d)).arrayBuffer());
  const primeiro = d.nome.split(" ")[0];
  const texto = `🏆 ${primeiro} ${d.genero === 2 ? "é a campeã" : "é o campeão"} da semana no ${d.titulo}! ${d.valor} ${d.un}, ${d.total}ª semana vencida. Quem tira do topo? #TaPago`;
  const r = await publicarArte(png, texto, "tp-campeao-" + vitoriaId);
  return { momento: r.status };
}

/**
 * Quem já treinou hoje (pra fileira de rostos da home): gente do ranking geral
 * (quem deixou aberto) e dos meus grupos. Mais recente primeiro, com a foto do treino.
 */
export function treinaramHoje(b: Banco, uid: string) {
  const dia = diaSP();
  const meusGrupos = new Set(b.grupos.filter(g => g.membros.includes(uid)).flatMap(g => g.membros));
  const visivel = (id: string) => { const u = b.usuarios[id]; return !!u && (meusGrupos.has(id) || (u.aparecer && !!u.phizId)); };
  const ultimo = new Map<string, Treino>();
  b.treinos.filter(t => t.dia === dia && !t.pendenteFoto && t.uid !== uid && visivel(t.uid))
    .sort((a, c) => c.criadoEm.localeCompare(a.criadoEm))
    .forEach(t => { if (!ultimo.has(t.uid)) ultimo.set(t.uid, t); });
  return [...ultimo.values()].slice(0, 15).map(t => {
    const u = b.usuarios[t.uid];
    const strava = t.fonte === "strava";
    return { uid: t.uid, nome: u.nome, avatar: u.avatar, tipo: strava ? "Treinou" : nomeDoTipo(t.tipo), min: strava ? 0 : t.min, fotoKey: t.fotoKey, em: t.criadoEm };
  });
}

export function limparVisivel(v?: { geral?: unknown; grupos?: unknown }): Treino["visivel"] {
  if (!v || typeof v !== "object") return undefined;
  const grupos = v.grupos === "todos" ? "todos" : Array.isArray(v.grupos) ? v.grupos.map(String).slice(0, 20) : "todos";
  return { geral: v.geral !== false, grupos };
}

/** Editar um treino meu: título e quem pode ver (os pontos não mudam). */
export async function editarTreino(uid: string, id: string, p: { titulo?: string; visivel?: { geral?: unknown; grupos?: unknown } }) {
  return alterarBanco(b => {
    const t = b.treinos.find(x => x.id === id && x.uid === uid);
    if (!t) throw new ErroAcao("Treino não encontrado.", 404);
    if (typeof p.titulo === "string") { const n = p.titulo.trim().replace(/\s+/g, " ").slice(0, 60); if (n) t.tituloProprio = n; else delete t.tituloProprio; }
    if (p.visivel) t.visivel = limparVisivel(p.visivel);
    t.visto = true;
    return { id: t.id, titulo: t.tituloProprio || t.titulo || "", visivel: t.visivel };
  });
}
