import { get, put } from "@vercel/blob";

/**
 * Régua de comunicação do Tá Pago! (mensagens do bot no chat), editável no /admin/regua.
 *
 * Cada passo tem um texto com {variáveis}. Os passos "no ar" já são enviados pelo servidor
 * (lib/mensagens.ts lê o texto daqui na hora de mandar); os "planejados" ficam só no papel até
 * alguém programar o gatilho. Desligar um passo no ar para o envio na hora.
 * Guardado em tapago/regua.json; o que não foi editado usa o texto padrão abaixo.
 */

const KEY = "tapago/regua.json";

export type Passo = {
  id: string;
  fase: string;
  nome: string;
  /** O que dispara: em linguagem simples. */
  gatilho: string;
  /** Quando sai (horário, atraso). */
  quando: string;
  texto: string;
  /** No ar = o servidor já manda. Planejada = ainda não programada. */
  status: "no-ar" | "planejada";
  ligada: boolean;
  /** Variáveis que o texto pode usar (só nos passos no ar, que o servidor preenche). */
  variaveis?: string[];
  /** Vai com imagem (arte) além do texto. */
  imagem?: string;
  /** O tipo registrado nas métricas (pra contar envios no admin). */
  tipoMetrica?: string;
  editadoEm?: string;
  /** Apagado no admin: some da régua e, se estava no ar, para de ser enviado. */
  apagado?: boolean;
};

export const FASES = ["Entrada", "Dia a dia", "Strava", "Grupos", "Ranking geral", "Níveis", "Campanhas", "Volta pro app"];

const NOME = "{nome}";

export const PADRAO: Passo[] = [
  // ── Entrada
  { id: "boas-vindas", fase: "Entrada", nome: "Boas-vindas", status: "no-ar", ligada: true, tipoMetrica: "boas-vindas",
    gatilho: "O telefone da pessoa entra no Tá Pago! (primeira mensagem que ela recebe)", quando: "Na hora",
    variaveis: ["nome"],
    texto: `Oi, ${NOME}! 💪 Você entrou no Tá Pago!.\n\nPor aqui eu te mando cada treino que você registrar e, todo dia às 17h, como você está no ranking.\n\nBora fazer o primeiro de hoje?` },
  { id: "primeiro-treino", fase: "Entrada", nome: "Primeiro treino", status: "planejada", ligada: true,
    gatilho: "Entrou há 1 dia e ainda não registrou treino", quando: "D+1 às 10h",
    texto: `Oi, ${NOME}! Ainda não tem treino seu no Tá Pago! 👀\n\nTreinou, tirou a foto, tá pago. Bora fazer o primeiro hoje? 💪` },
  { id: "crie-grupo", fase: "Entrada", nome: "Crie seu grupo", status: "planejada", ligada: true,
    gatilho: "Já treinou, mas não está em nenhum grupo", quando: "D+3 às 12h",
    texto: `${NOME}, treinar com a galera é outro nível 🔥\n\nCria um grupo no Tá Pago!, chama seus amigos e façam uma competição: quem treinar mais na semana leva o troféu 🏆` },

  // ── Dia a dia
  { id: "treino", fase: "Dia a dia", nome: "Treino registrado", status: "no-ar", ligada: true, tipoMetrica: "treino", imagem: "A foto do treino",
    gatilho: "A pessoa registra um treino com foto", quando: "Na hora",
    variaveis: ["tipo", "min", "min_dia", "pos", "total"],
    texto: `✅ Tá pago! {tipo} · {min} min. Hoje: {min_dia} min, {pos}º de {total}.` },
  { id: "17h-treinou", fase: "Dia a dia", nome: "Resumo das 17h (já treinou)", status: "no-ar", ligada: true, tipoMetrica: "17h",
    gatilho: "Todo dia, pra quem já treinou hoje", quando: "17h",
    variaveis: ["nome", "min", "pos", "total", "sequencia", "top3"],
    texto: `Parabéns pelo dia de treino, ${NOME}! 🔥\n\nHoje você fez {min} min e está em {pos}º de {total}.{sequencia}{top3}` },
  { id: "17h-falta", fase: "Dia a dia", nome: "Resumo das 17h (ainda não treinou)", status: "no-ar", ligada: true, tipoMetrica: "17h",
    gatilho: "Todo dia, pra quem ainda não treinou hoje", quando: "17h",
    variaveis: ["nome", "pos", "total", "alvo", "sequencia", "top3"],
    texto: `Ainda dá tempo de treinar hein, ${NOME}! 👀\n\nHoje você está em {pos}º de {total}.{alvo}{sequencia}{top3}` },
  { id: "sequencia-risco", fase: "Dia a dia", nome: "Sequência em risco", status: "planejada", ligada: true,
    gatilho: "Tem 3+ dias seguidos e ainda não treinou hoje", quando: "20h",
    texto: `🔥 ${NOME}, sua sequência de {seq} dias acaba à meia-noite.\n\nUm treino de 20 min já salva. Bora?` },
  { id: "ia-resposta", fase: "Dia a dia", nome: "Resposta da IA (quando a pessoa escreve)", status: "no-ar", ligada: false, tipoMetrica: "ia",
    gatilho: "A pessoa manda mensagem pro bot. A IA responde só sobre a conta dela (treinos, pontos, nível, ranking, grupos). Desligar aqui para a IA na hora.",
    quando: "Na hora",
    texto: "Por aqui eu só consigo te ajudar com a sua conta do Tá Pago!: seus treinos, pontos, nível, ranking e grupos. 💪" },
  { id: "cutucada", fase: "Dia a dia", nome: "Cutucada", status: "no-ar", ligada: true, tipoMetrica: "cutucada",
    gatilho: "Alguém do grupo cutuca quem ainda não treinou hoje (sorteia uma das versões)", quando: "Na hora",
    variaveis: ["quem"],
    texto: `👀 {quem} está te cutucando pra treinar!\n\nHoje ainda não tem treino seu no Tá Pago!. Bora mostrar serviço? 💪\n---\n👉 {quem} te cutucou: cadê o treino de hoje?\n\nAbre o Tá Pago!, registra e deixa claro quem manda no ranking 🔥\n---\n⏰ {quem} acha que você tá devendo um treino hoje.\n\nVai deixar barato? Abre o Tá Pago! e registra 💥` },

  // ── Strava
  { id: "strava", fase: "Strava", nome: "Chegou do Strava", status: "no-ar", ligada: true, tipoMetrica: "strava", imagem: "A arte do treino",
    gatilho: "Um treino novo chega do Strava", quando: "Na hora",
    variaveis: ["emoji", "titulo", "min", "km", "pts", "posicao"],
    texto: `{emoji} Chegou do Strava: {titulo} · {min} min{km}\n\n✅ Tá pago! Hoje você tem {pts} pts{posicao}\n\nAbre o Tá Pago! pra ver sua pontuação ou postar nos Momentos.` },
  { id: "strava-foto", fase: "Strava", nome: "Strava lançado à mão (pede foto)", status: "no-ar", ligada: true, tipoMetrica: "strava",
    gatilho: "Chega do Strava um treino lançado à mão (só vale com foto)", quando: "Na hora",
    variaveis: ["emoji", "titulo", "min", "km"],
    texto: `{emoji} Chegou do Strava: {titulo} · {min} min{km}\n\nEssa foi lançada à mão no Strava, então só vale ponto com foto. Abre o Tá Pago! e tira a foto do treino 📸` },
  { id: "link-strava", fase: "Strava", nome: "Link pra conectar o Strava", status: "no-ar", ligada: true, tipoMetrica: "link-strava",
    gatilho: "A pessoa pede pra conectar pelo navegador (o login do Strava não abriu no app)", quando: "Na hora",
    variaveis: ["link"],
    texto: `🔗 Seu link pra conectar o Strava ao Tá Pago!:\n\n{link}\n\nToque nele, entre no Strava e autorize. Depois é só voltar pro Tá Pago!. O link vale 30 minutos.` },
  { id: "conecte-strava", fase: "Strava", nome: "Conecte o Strava", status: "planejada", ligada: true,
    gatilho: "Já registrou 2+ treinos com foto e não tem Strava", quando: "Depois do 2º treino, no dia seguinte às 9h",
    texto: `${NOME}, sabia que dá pra o treino entrar sozinho? ⌚\n\nConecta o Strava (ou o Garmin pelo Strava) no Tá Pago! e cada atividade vira ponto automático.` },

  // ── Grupos
  { id: "convite-grupo", fase: "Grupos", nome: "Convite pra grupo", status: "planejada", ligada: true,
    gatilho: "Um amigo te convida pra um grupo pelo app", quando: "Na hora",
    texto: `💌 {quem} te chamou pro grupo {grupo} no Tá Pago!.\n\nAbre o miniapp e toca em Entrar. Bora disputar?` },
  { id: "entrou-grupo", fase: "Grupos", nome: "Alguém entrou no seu grupo", status: "planejada", ligada: true,
    gatilho: "Uma pessoa entra num grupo que você criou", quando: "Na hora (no máximo 1 por dia)",
    texto: `🙌 {quem} entrou no {grupo}! Agora são {membros} na disputa.` },
  { id: "domingo-grupo", fase: "Grupos", nome: "Pódio da semana do grupo", status: "no-ar", ligada: true, tipoMetrica: "domingo", imagem: "A arte do pódio",
    gatilho: "Toda semana, pra cada grupo com 2+ pessoas", quando: "Domingo às 20h",
    variaveis: ["titulo", "podio", "campeao", "minha"],
    texto: `🏆 Fechou a semana no {titulo}!\n\n{podio}\n\n{campeao}{minha}` },
  { id: "desafio-acabando", fase: "Grupos", nome: "Desafio acabando", status: "planejada", ligada: true,
    gatilho: "Faltam 3 dias pro fim do desafio do grupo", quando: "3 dias antes do fim, às 12h",
    texto: `⏳ Faltam 3 dias pro fim do desafio {grupo}.\n\nVocê está em {pos}º. Ainda dá pra virar 💪` },
  { id: "desafio-fim", fase: "Grupos", nome: "Desafio encerrado", status: "planejada", ligada: true, imagem: "A arte do pódio",
    gatilho: "O desafio do grupo terminou", quando: "No dia seguinte ao fim, às 10h",
    texto: `🏁 Acabou o desafio {grupo}!\n\n{podio}\n\nBora marcar o próximo?` },

  // ── Ranking geral
  { id: "domingo-geral", fase: "Ranking geral", nome: "Pódio da semana do geral", status: "no-ar", ligada: true, tipoMetrica: "domingo", imagem: "A arte do pódio",
    gatilho: "Toda semana, pra quem aparece no ranking geral", quando: "Domingo às 20h",
    variaveis: ["titulo", "podio", "campeao", "minha"],
    texto: `🏆 Fechou a semana no {titulo}!\n\n{podio}\n\n{campeao}{minha}` },
  { id: "campeao", fase: "Ranking geral", nome: "Você é o campeão da semana", status: "planejada", ligada: true, imagem: "A arte de campeão",
    gatilho: "A pessoa venceu a semana (no grupo ou no geral)", quando: "Segunda às 9h",
    texto: `👑 ${NOME}, você venceu a semana no {grupo}!\n\nAbre o Tá Pago! que tem uma comemoração (e uma arte) te esperando.` },
  { id: "subiu", fase: "Ranking geral", nome: "Você subiu no ranking", status: "planejada", ligada: true,
    gatilho: "Subiu 3+ posições no geral desde ontem", quando: "No máximo 1 por semana, às 19h",
    texto: `📈 ${NOME}, você subiu pro {pos}º no ranking geral do Tá Pago!. Segura essa!` },

  // ── Níveis
  { id: "subiu-faixa", fase: "Níveis", nome: "Subiu de faixa", status: "no-ar", ligada: true, tipoMetrica: "subiu-faixa", imagem: "A arte do nível",
    gatilho: "Um treino leva a pessoa pra uma faixa nova (Forte, Sinistro, Casca grossa…)", quando: "Na hora (depois da mensagem do treino)",
    variaveis: ["nome", "faixa", "nivel", "destrave"],
    texto: `🚀 ${NOME}, você virou {faixa}! Nível {nivel} no Tá Pago!.{destrave}\n\nAbre o app que tem uma comemoração te esperando.` },
  { id: "quase-faixa", fase: "Níveis", nome: "Quase na próxima faixa", status: "no-ar", ligada: true, tipoMetrica: "quase-faixa", variaveis: ["nome", "faixa", "falta", "nivel"],
    gatilho: "Faltam até 30 pontos (um treino) pra próxima faixa; uma vez por faixa", quando: "Todo dia às 9h",
    texto: `👀 ${NOME}, falta só um treino pra você virar {faixa}. Bora?` },

  // ── Campanhas (conquistas e datas especiais, criadas no /admin/campanhas)
  { id: "conquista-ganhou", fase: "Campanhas", nome: "Ganhou uma conquista", status: "no-ar", ligada: true, tipoMetrica: "conquista", imagem: "A arte da conquista",
    gatilho: "Um treino faz a pessoa ganhar uma conquista (ex.: treinou no Halloween)", quando: "Na hora (depois da mensagem do treino)",
    variaveis: ["nome", "conquista", "descricao"],
    texto: `🏅 ${NOME}, você ganhou a conquista {conquista}!\n\n{descricao} Ela já está no seu perfil do Tá Pago!. Abre lá pra ver e postar.` },
  { id: "campanha-lembrete", fase: "Campanhas", nome: "Lembrete da campanha do dia", status: "no-ar", ligada: true, tipoMetrica: "campanha", imagem: "O badge da campanha",
    gatilho: "Tem conquista de treino valendo hoje e a pessoa ainda não ganhou. Se a campanha tiver mensagem própria (admin de campanhas), vai a dela", quando: "No dia, às 9h",
    variaveis: ["nome", "conquista", "descricao"],
    texto: `🏅 ${NOME}, hoje tem badge de edição limitada no Tá Pago!: {conquista}.\n\nTreine hoje e ganhe. Ele fica no seu perfil pra sempre, mas só vale hoje!` },
  { id: "campanha-ultima", fase: "Campanhas", nome: "Última chamada da campanha", status: "no-ar", ligada: true, tipoMetrica: "campanha",
    gatilho: "Tem conquista de treino valendo hoje e a pessoa ainda não treinou", quando: "No dia, às 20h",
    variaveis: ["nome", "conquista"],
    texto: `⏰ ${NOME}, faltam 4 horas pra ganhar a conquista {conquista}. Um treino leve já vale!` },

  // ── Volta pro app
  { id: "3-dias", fase: "Volta pro app", nome: "3 dias sem treinar", status: "no-ar", ligada: true, tipoMetrica: "3-dias", variaveis: ["nome", "dias"],
    gatilho: "Já treinou antes e está há 3 dias sem treino", quando: "3º dia às 18h",
    texto: `Saudade de você no ranking, ${NOME} 😅\n\nFaz 3 dias sem treino. Que tal voltar hoje com um treino leve?` },
  { id: "7-dias", fase: "Volta pro app", nome: "7 dias sem abrir", status: "no-ar", ligada: true, tipoMetrica: "7-dias", variaveis: ["nome", "pos", "total"],
    gatilho: "Não abre o miniapp há 7 dias", quando: "7º dia às 12h",
    texto: `${NOME}, a galera continua treinando no Tá Pago! 🔥\n\nVocê está em {pos}º no geral. Abre e vê quem passou você.` },
];

let cache: { em: number; passos: Passo[] } | null = null;

/** A régua inteira: o padrão com as edições por cima (+ passos novos criados no admin). */
export async function lerRegua(): Promise<Passo[]> {
  if (cache && Date.now() - cache.em < 60_000) return cache.passos;
  let salvos: Passo[] = [];
  try {
    const r = await get(KEY, { access: "private", useCache: false });
    if (r && r.statusCode === 200 && r.stream) salvos = JSON.parse(await new Response(r.stream).text());
  } catch { /* sem edição ainda */ }
  const porId = new Map(salvos.map(p => [p.id, p]));
  const base = PADRAO.filter(p => !porId.get(p.id)?.apagado).map(p => {
    const s = porId.get(p.id);
    // Do salvo vem só o que é editável; o resto (variáveis, tipo, status) é sempre o do código.
    return s ? { ...p, texto: s.texto, ligada: s.ligada, nome: s.nome || p.nome, gatilho: s.gatilho ?? p.gatilho, quando: s.quando ?? p.quando, fase: s.fase || p.fase, editadoEm: s.editadoEm } : p;
  });
  const novos = salvos.filter(s => !s.apagado && !PADRAO.some(p => p.id === s.id)).map(s => ({ ...s, status: "planejada" as const }));
  const passos = [...base, ...novos];
  cache = { em: Date.now(), passos };
  return passos;
}

export async function salvarRegua(passos: Passo[]) {
  await put(KEY, JSON.stringify(passos), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
  cache = null;
}

/**
 * O texto pronto de um passo no ar, com as variáveis preenchidas. null = desligado (não manda).
 * Texto com "---" em linhas separadas tem versões: sorteia uma.
 */
export async function textoDe(id: string, vars: Record<string, string | number | undefined>): Promise<string | null> {
  const p = (await lerRegua()).find(x => x.id === id);
  if (!p || !p.ligada) return null; // desligado ou apagado no admin
  const versoes = p.texto.split(/\n-{3,}\n/).map(v => v.trim()).filter(Boolean);
  const t = versoes[Math.floor(Math.random() * versoes.length)] || "";
  return t.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] === undefined || vars[k] === null ? "" : String(vars[k])));
}
