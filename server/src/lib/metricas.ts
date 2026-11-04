import { get, put } from "@vercel/blob";

/**
 * Métricas de uso (fora do banco principal, pra não brigar com as gravações dos treinos):
 *   · sessoes   — cada vez que a pessoa abre o miniapp (nova sessão depois de 30 min sem abrir)
 *   · envios    — cada mensagem do bot no chat (tipo, status, id da mensagem)
 *   · statusBot — o que o webhook do bot avisar (entregue / lida), quando avisar
 * Guarda só ids, tipos e horários: nada de telefone nem texto da mensagem.
 */
const KEY = "tapago/metricas.json";
const SESSAO_MIN = 30;

export type Sessao = { uid: string; em: string };
export type EnvioReg = { uid: string; tipo: string; em: string; status: string; erro?: string; msgId?: string };
export type StatusBot = { em: string; id: string; status: string };
/** Fatos que não ficam no banco: foto conferida pela IA (inclusive recusada), Strava ligado/desligado. */
export type Evento = { tipo: "foto-ia" | "strava-conectou" | "strava-desconectou" | "strava-tentou"; uid: string; em: string; status?: string };
export type Metricas = { sessoes: Sessao[]; ultimo: Record<string, string>; envios: EnvioReg[]; statusBot: StatusBot[]; eventos: Evento[] };

const VAZIO: Metricas = { sessoes: [], ultimo: {}, envios: [], statusBot: [], eventos: [] };

export async function lerMetricas(): Promise<Metricas> {
  try {
    const r = await get(KEY, { access: "private", useCache: false });
    if (!r || r.statusCode !== 200 || !r.stream) return structuredClone(VAZIO);
    const m = JSON.parse(await new Response(r.stream).text()) as Partial<Metricas>;
    return { sessoes: m.sessoes ?? [], ultimo: m.ultimo ?? {}, envios: m.envios ?? [], statusBot: m.statusBot ?? [], eventos: m.eventos ?? [] };
  } catch {
    return structuredClone(VAZIO);
  }
}

async function alterar(fn: (m: Metricas) => boolean | void) {
  const m = await lerMetricas();
  if (fn(m) === false) return;
  m.sessoes = m.sessoes.slice(-30000);
  m.envios = m.envios.slice(-10000);
  m.statusBot = m.statusBot.slice(-5000);
  m.eventos = m.eventos.slice(-10000);
  await put(KEY, JSON.stringify(m), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
}

/** A pessoa abriu o miniapp (chamado no painel). Só grava quando é uma sessão nova. */
export async function registrarAbertura(uid: string) {
  const agora = new Date();
  await alterar(m => {
    const ult = m.ultimo[uid];
    m.ultimo[uid] = agora.toISOString();
    if (ult && agora.getTime() - Date.parse(ult) < SESSAO_MIN * 60_000) {
      // Mesma sessão: só atualiza o "último acesso" a cada 5 min (poupa gravação).
      return agora.getTime() - Date.parse(ult) > 5 * 60_000;
    }
    m.sessoes.push({ uid, em: agora.toISOString() });
  }).catch(() => {});
}

export async function registrarEvento(tipo: Evento["tipo"], uid: string, status?: string) {
  await alterar(m => { m.eventos.push({ tipo, uid, em: new Date().toISOString(), ...(status ? { status } : {}) }); }).catch(() => {});
}

export async function registrarEnvio(e: EnvioReg) {
  await alterar(m => { m.envios.push(e); }).catch(() => {});
}

/** Webhook do bot: procura {id, status} em qualquer lugar do evento (o formato exato não é documentado). */
export async function registrarStatusBot(ev: unknown) {
  const achados: StatusBot[] = [];
  const em = new Date().toISOString();
  const andar = (o: unknown, prof: number) => {
    if (!o || typeof o !== "object" || prof > 6) return;
    if (Array.isArray(o)) { o.forEach(x => andar(x, prof + 1)); return; }
    const r = o as Record<string, unknown>;
    const id = r.id ?? r.message_id ?? r.messageId;
    const st = r.status ?? r.message_status;
    if (typeof id === "string" && typeof st === "string") achados.push({ em, id, status: st.toUpperCase() });
    Object.values(r).forEach(x => andar(x, prof + 1));
  };
  andar(ev, 0);
  if (achados.length) await alterar(m => { m.statusBot.push(...achados); }).catch(() => {});
}
