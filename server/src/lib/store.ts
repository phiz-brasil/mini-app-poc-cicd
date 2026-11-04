import { BlobPreconditionFailedError, del, get, put } from "@vercel/blob";

/**
 * Tudo que fala com o armazenamento mora aqui. Rotas e páginas só chamam
 * estas funções — trocar Blob por Postgres um dia muda só este arquivo.
 *
 * Beta: o banco inteiro é um JSON (`tapago/banco.json`) num store PRIVADO do
 * Vercel Blob, e as fotos ficam em `tapago/fotos/…` no mesmo store, servidas
 * pela rota /api/foto (nunca com URL pública). Escrita é ler-alterar-gravar:
 * dois registros no mesmo milissegundo, o último ganha. Pro volume do beta
 * (dezenas de pessoas) é aceitável.
 */

export type Usuario = {
  id: string;
  /** HMAC da credencial de login (ver lib/ids.ts). Nunca sai do servidor. */
  chave?: string;
  /** HMAC do segredo que só o aparelho tem (gerado no app, nunca aparece em lugar nenhum). Ver lib/ids.ts. */
  segredo?: string;
  nome: string;
  /** Foto do perfil do PhizChat (URL), se o PhizChat entregar. */
  avatar?: string;
  /** Idioma do aparelho (pt, en…), pra falar a língua da pessoa desde a entrada. */
  idioma?: string;
  /** Do getUserInfo do PhizChat (o app devolve sem perguntar). Ainda não verificado pelo servidor. */
  phizId?: string;
  usuario?: string;
  cidade?: string;
  /** 0 = não informado, 1 = masculino, 2 = feminino (padrão do getUserInfo). */
  genero?: number;
  /** Telefone pra mensagem no chat (+55…). Beta: vem da lista TAPAGO_TELEFONES. */
  telefone?: string;
  /** Página pessoal visível pros outros (números e treinos). Padrão: aberta. */
  perfilPublico?: boolean;
  /** Selo verificado do PhizChat (identidade conferida). Vem do perfil quando o PhizChat mandar; no beta, TAPAGO_VERIFICADOS. */
  verificado?: boolean;
  /** Mensagens do Tá Pago! no chat (padrão: ligado). Desligar NÃO apaga o telefone (se voltar, já está aqui). */
  avisos?: boolean;
  /** Quando desligou os avisos (descadastro). */
  avisosSaiuEm?: string;
  /** Pediu pra receber avisos no chat e ainda não tem telefone: entra na lista do admin. */
  querAvisos?: string;
  /** Último nível que a pessoa viu comemorar (a comemoração aparece quando o nível passa disso). */
  nivelVisto?: number;
  /** Tocou em "Agora não" na folha de avisos (pra não perguntar de novo tão cedo). */
  avisosPerguntaEm?: string;
  /** Fotos de moldura enviadas hoje (limite diário). */
  molduras?: { dia: string; n: number };
  /** Passos da régua que só saem uma vez por ocasião: id do passo → marca da ocasião (ex.: faixa, dia do último treino). */
  regua?: Record<string, string>;
  /** Conquistas (badges) que a pessoa ganhou: ficam pra sempre. `vista` = já viu a comemoração no app. */
  conquistas?: { id: string; em: string; vista?: boolean }[];
  /** Respostas da IA do bot: contagem do dia (limite) e ids das mensagens já respondidas. */
  botIa?: { dia: string; n: number; ids: string[] };
  /** Últimos envios (diagnóstico do limite diário). */
  mensagens?: { tipo: string; em: string; status: string; erro?: string }[];
  /** A pessoa mudou o nome nos Ajustes: o do PhizChat não sobrescreve mais. */
  nomeProprio?: boolean;
  criadoEm: string;
  /** Aparece no ranking GERAL do app (pontos Tá Pago!). Desligado: só os grupos dela a veem. */
  aparecer: boolean;
  /** Opt-in: a conta oficial (robô da OpenAPI) pode postar o treino nos Momentos. */
  destaques: boolean;
  /** Strava conectado. Tokens ficam só aqui (store privado), nunca saem pro cliente. */
  strava?: { athleteId: number; accessToken: string; refreshToken: string; expiresAt: number; conectadoEm: string; nome?: string };
};

/** O que pode sair pro cliente: nada de token. */
export type UsuarioPublico = ReturnType<typeof publico>;

export function publico(u: Usuario) {
  const { strava, telefone, mensagens, molduras, chave, segredo, regua, botIa, ...resto } = u;
  return { ...resto, temTelefone: !!telefone, conectados: { strava: strava ? { desde: strava.conectadoEm, nome: strava.nome || "" } : null } };
}

export type Destaque = {
  status: "publicado" | "falhou" | "sem-config" | "enviando";
  requestNo?: string;
  erro?: string;
  em: string;
};

export type Treino = {
  id: string;
  /** Do Strava (quando vem): FC média, calorias e subida em metros — detalhes do card. */
  fc?: number;
  kcal?: number;
  elevM?: number;
  /** Bairro/cidade do meio da rota (OSM), pro card com mapa. */
  lugar?: { bairro: string; cidade: string };
  uid: string;
  /** Dia em São Paulo, YYYY-MM-DD. */
  dia: string;
  tipo: string;
  min: number;
  fonte: "manual" | "saude" | "strava" | "garmin";
  /** Id da atividade na origem (Strava/Garmin), pra não importar duas vezes. */
  externoId?: string;
  /** Título que veio da origem ("Corrida matinal"). */
  titulo?: string;
  distanciaM?: number;
  /** Trajeto do Strava (polyline do Google, resumida) — vira o desenho da arte. */
  polyline?: string;
  /** Foto que a pessoa pôs no Strava (URL pública do Strava). */
  fotoExterna?: string;
  /** Lançado à mão no Strava: só vale ponto quando a pessoa põe foto no app. */
  pendenteFoto?: boolean;
  /** A pessoa já viu a folha "Chegou do Strava" no app. */
  visto?: boolean;
  /** Início da atividade (Strava), pra não duplicar com treino à mão. */
  inicioEm?: string;
  /** Título que a pessoa escolheu no app (vale mais que o do Strava). */
  tituloProprio?: string;
  /** Quem pode ver na timeline: geral e quais grupos ("todos" = todos os meus). Pontos contam sempre. */
  visivel?: { geral: boolean; grupos: string[] | "todos" };
  fotoKey?: string;
  fotoW?: number;
  fotoH?: number;
  criadoEm: string;
  destaque?: Destaque;
  /** Conferência da foto (treino à mão). "recusada" nunca chega a ser gravada. */
  validacao?: import("./validacao").Validacao;
  /** O que a pessoa pediu na tela de parabéns. */
  publicar?: { momentos: boolean; clipes: boolean; em: string; momento?: Destaque; clipe?: Destaque };
};

export type TaPago = { de: string; para: string; dia: string; em: string };

/** Campeão da semana (de um grupo ou do geral). Guardado quando a semana fecha. */
export type Vitoria = {
  id: string; semana: string; chave: string; titulo: string; uid: string;
  valor: string; un: string; membros: number; em: string; vista?: boolean;
};

/** Convite pra um grupo feito pelo seletor de amigos do PhizChat (fica esperando a pessoa abrir o app). */
export type Convite = { id: string; grupo: string; de: string; paraPhizId: string; nome?: string; em: string; status: "pendente" | "aceito" | "recusado" };

/** "Cutucar pra treinar": uma por pessoa por dia, vira mensagem no chat de quem foi cutucado. */
export type Cutucada = { de: string; para: string; dia: string; em: string; chat?: string };

export type Grupo = {
  id: string;
  nome: string;
  /** Código curto do convite (vai no cartão compartilhado no chat). */
  codigo: string;
  criador: string;
  /** Desafio com data (opcional, o admin escolhe): o "Geral" do grupo conta só entre início e fim. */
  inicio?: string;
  fim?: string;
  /** Como o grupo conta: dias ativos, duração (min) ou distância (km). Antigos: duração. */
  metrica?: "dias" | "duracao" | "distancia";
  membros: string[];
  criadoEm: string;
};

export type Banco = {
  usuarios: Record<string, Usuario>;
  treinos: Treino[];
  tapagos: TaPago[];
  grupos: Grupo[];
  cutucadas: Cutucada[];
  vitorias: Vitoria[];
  convites: Convite[];
};

const KEY = "tapago/banco.json";
const VAZIO: Banco = { usuarios: {}, treinos: [], tapagos: [], grupos: [], cutucadas: [], vitorias: [], convites: [] };

export function armazenamentoConfigurado(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function lerBanco(): Promise<Banco> {
  return (await lerComEtag()).b;
}

/** Lê o banco e o ETag da versão lida (pra gravar só se ninguém mudou no meio). */
async function lerComEtag(): Promise<{ b: Banco; etag?: string }> {
  if (!armazenamentoConfigurado()) throw new Error("BLOB_READ_WRITE_TOKEN ausente.");
  try {
    const res = await get(KEY, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200 || !res.stream) return { b: structuredClone(VAZIO) };
    // O get devolve o ETag "fraco" (W/"…"); a gravação condicional quer o forte, sem o W/.
    const etag = (res.blob as { etag?: string }).etag?.replace(/^W\//, "");
    const text = await new Response(res.stream).text();
    if (!text.trim()) return { b: structuredClone(VAZIO), etag };
    const b = JSON.parse(text) as Partial<Banco>;
    return { b: { usuarios: b.usuarios ?? {}, treinos: b.treinos ?? [], tapagos: b.tapagos ?? [], grupos: b.grupos ?? [], cutucadas: b.cutucadas ?? [], vitorias: b.vitorias ?? [], convites: b.convites ?? [] }, etag };
  } catch (err) {
    // Primeira execução: o blob ainda não existe.
    if (err instanceof Error && /not.?found|404/i.test(err.message)) return { b: structuredClone(VAZIO) };
    throw err;
  }
}

async function gravarBanco(b: Banco, etag?: string): Promise<void> {
  await put(KEY, JSON.stringify(b), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: 0,
    ...(etag ? { ifMatch: etag } : {}),
  });
}

/**
 * Ler-alterar-gravar. A função recebe o banco e muda o que precisar.
 * Só grava se algo mudou, e só por cima da versão que leu (ETag): se outro pedido gravou no meio,
 * lê de novo e reaplica a mudança. Antes, abrir o app regravava o banco inteiro e podia apagar
 * o que outro processo tinha acabado de salvar.
 */
export async function alterarBanco<T>(fn: (b: Banco) => T): Promise<T> {
  for (let tentativa = 0; ; tentativa++) {
    const { b, etag } = await lerComEtag();
    const antes = JSON.stringify(b);
    const r = fn(b);
    if (JSON.stringify(b) === antes) return r;
    try {
      await gravarBanco(b, etag);
      return r;
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError && tentativa < 6) { await new Promise(ok => setTimeout(ok, 80 + Math.random() * 200)); continue; }
      throw e;
    }
  }
}

export async function salvarFoto(key: string, dados: ArrayBuffer, contentType: string): Promise<void> {
  await put(key, Buffer.from(dados), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType,
    cacheControlMaxAge: 31536000,
  });
}

export async function apagarFoto(key: string): Promise<void> {
  await del(key).catch(() => undefined);
}

export async function lerFotoBytes(key: string): Promise<{ dados: ArrayBuffer; tipo: string } | null> {
  const f = await lerFoto(key);
  if (!f) return null;
  return { dados: await new Response(f.stream).arrayBuffer(), tipo: f.contentType };
}

export async function lerFoto(key: string): Promise<{ stream: ReadableStream; contentType: string } | null> {
  try {
    const res = await get(key, { access: "private" });
    if (!res || res.statusCode !== 200 || !res.stream) return null;
    return { stream: res.stream, contentType: res.blob?.contentType || "image/jpeg" };
  } catch {
    return null;
  }
}
