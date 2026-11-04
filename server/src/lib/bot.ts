/**
 * Mensagens no chat do PhizChat, pelo bot de um canal (Robot Business API —
 * a mesma do PhizChat Report).
 *
 *   auth:   POST https://gateway.phiz.chat/gateway/openapi/auth  { app_id, app_secret, grant_type: "user_credentials" }
 *   enviar: POST https://gateway.phiz.chat/v4/openapi/oauth/channel/robot/business/{canal}/messages
 *           { messaging_product: "phiz", recipient_type: "individual", to: ["+55…"], type: "text"|"image", … }
 *
 * O destinatário é o TELEFONE (+55…). PhizID não serve: volta 100108
 * "The phone number is not registered" (testado em 20/10).
 * Limite: cerca de 10 mensagens por pessoa por dia por canal (erro 15010) —
 * por isso o Tá Pago! manda pouco: boas-vindas, 1 por treino e o resumo das 17h.
 * Sempre ler o status por contato: o HTTP diz 200 mesmo quando falha.
 */

const UA = "tapago/0.1";
let cache: { token: string; expira: number } | null = null;

export function botConfigurado(): boolean {
  return Boolean(process.env.TAPAGO_BOT_APP_ID && process.env.TAPAGO_BOT_APP_SECRET && process.env.TAPAGO_BOT_CANAL);
}

async function token(): Promise<string> {
  if (cache && cache.expira > Date.now() + 5 * 60_000) return cache.token;
  const r = await fetch("https://gateway.phiz.chat/gateway/openapi/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ app_id: process.env.TAPAGO_BOT_APP_ID, app_secret: process.env.TAPAGO_BOT_APP_SECRET, description: "tapago", grant_type: "user_credentials", device_fingerprint: "" }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  const t = j?.data?.access_token;
  if (!t) throw new Error("Bot: auth falhou (" + (j?.code || r.status) + ")");
  cache = { token: t, expira: Date.now() + 100 * 60_000 };
  return t;
}

export type Envio = { ok: boolean; status: string | null; erro?: string; msgId?: string };

async function enviar(to: string, mensagem: Record<string, unknown>): Promise<Envio> {
  if (!botConfigurado()) return { ok: false, status: null, erro: "bot não configurado" };
  try {
    const r = await fetch(`https://gateway.phiz.chat/v4/openapi/oauth/channel/robot/business/${process.env.TAPAGO_BOT_CANAL}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA, Authorization: "Bearer " + (await token()) },
      body: JSON.stringify({ messaging_product: "phiz", recipient_type: "individual", to: [to], ...mensagem }),
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    const c = (j?.data?.contacts || [])[0] || {};
    const status = c.message_status ?? null;
    const ok = r.ok && status !== "FAILED" && j?.success !== false;
    const msgId = c.message_id ?? c.messageId ?? c.id ?? j?.data?.messages?.[0]?.id;
    return { ok, status, erro: c.error ? `${c.error.code} ${c.error.message}` : ok ? undefined : String(j?.msg || r.status), msgId: msgId ? String(msgId) : undefined };
  } catch (e) {
    return { ok: false, status: null, erro: e instanceof Error ? e.message : String(e) };
  }
}

export const enviarTexto = (to: string, body: string) => enviar(to, { type: "text", text: { body } });
/** Legenda é obrigatória e o app corta em ~130 caracteres. */
export const enviarImagem = (to: string, link: string, caption: string) =>
  enviar(to, { type: "image", image: { link, caption: caption.slice(0, 128) } });
