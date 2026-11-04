/**
 * Cliente da OpenAPI de Clipes e Momentos do PhizChat (guia v1.4, 02/09/2026).
 *
 *   1. POST /openapi/v3.0/token                 → token (2 h)
 *   2. GET  /openapi/v3.0/robot/list            → robôs autorizados pro app
 *   3. POST /openapi/v3.0/media/upload/presign  → URL pra subir a mídia
 *   4. POST /openapi/clips/batch/publish        → Clipes (até 100 por lote)
 *   5. POST /openapi/v3.0/moment/batchPublish   → Momentos (até 20 por lote)
 *   6. GET  /openapi/v3.0/common/result         → resultado
 *
 * IMPORTANTE: a OpenAPI publica como CONTA ROBÔ autorizada pro app — não no
 * perfil de quem treinou — e o post já sai aprovado e no ar. Por isso o
 * Tá Pago! só usa pros "destaques" da conta oficial, com opt-in da pessoa.
 *
 * Só roda no servidor: o appSecret nunca vai pro navegador.
 */

const APP_ID = process.env.PHIZ_APP_ID || "";
const UA = "tapago/0.1";

export function openapiConfigurada(): boolean {
  return Boolean(process.env.PHIZ_OPENAPI_HOST && process.env.PHIZ_APP_SECRET);
}

/**
 * PHIZ_OPENAPI_HOST pode ter caminho: o gateway do PhizChat monta a OpenAPI
 * debaixo de /gateway (ex.: "gateway.phiz.chat/gateway"), igual ao
 * /gateway/openapi/auth que o bot do PhizChat Report usa.
 */
function base(): string {
  const h = (process.env.PHIZ_OPENAPI_HOST || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!h) throw new Error("PHIZ_OPENAPI_HOST ausente.");
  return "https://" + h;
}

type Resposta<T> = { code: number; msg?: string; data?: T };

export class ErroOpenAPI extends Error {
  constructor(msg: string, public status?: number, public code?: number) {
    super(msg);
  }
}

/* ── Token (cache em memória da instância, renova 5 min antes) ───────── */
let tokenCache: { token: string; expira: number } | null = null;

async function token(forcar = false): Promise<string> {
  if (!forcar && tokenCache && tokenCache.expira - Date.now() > 5 * 60_000) return tokenCache.token;
  const secret = process.env.PHIZ_APP_SECRET;
  if (!secret) throw new Error("PHIZ_APP_SECRET ausente.");
  const r = await fetch(base() + "/openapi/v3.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ appId: APP_ID, appSecret: secret, scope: "basic" }),
    cache: "no-store",
  });
  const j = (await r.json().catch(() => ({}))) as Resposta<{ token: string; expireTime: string }> & { message?: string };
  if (!r.ok || j.code !== 200 || !j.data?.token) throw new ErroOpenAPI("Token: " + (j.msg || j.message || "HTTP " + r.status), r.status, j.code);
  const expira = Date.parse(j.data.expireTime) || Date.now() + 2 * 3600_000;
  tokenCache = { token: j.data.token, expira };
  return j.data.token;
}

/** Chamada autenticada. Em 401/403 renova o token uma vez e tenta de novo. */
async function chamar<T>(caminho: string, init: RequestInit = {}, tentou = false): Promise<T> {
  const t = await token(tentou);
  const r = await fetch(base() + caminho, {
    ...init,
    headers: { "Content-Type": "application/json", "User-Agent": UA, Authorization: "Bearer " + t, ...(init.headers || {}) },
    cache: "no-store",
  });
  if ((r.status === 401 || r.status === 403) && !tentou) return chamar<T>(caminho, init, true);
  const j = (await r.json().catch(() => ({}))) as Resposta<T>;
  if (!r.ok || j.code !== 200) throw new ErroOpenAPI(caminho + ": " + (j.msg || "HTTP " + r.status), r.status, j.code);
  return j.data as T;
}

/* ── Robôs ───────────────────────────────────────────────────────────── */
export type Robo = { robotId: string; robotName: string; handle_name?: string; avatar?: string; status: number };

export async function listarRobos(): Promise<{ total: number; list: Robo[] }> {
  return chamar("/openapi/v3.0/robot/list?pageNum=1&pageSize=50", { method: "GET" });
}

/** PHIZ_ROBOT_ID se configurado; senão o primeiro robô autorizado. */
export async function roboDoApp(): Promise<string> {
  if (process.env.PHIZ_ROBOT_ID) return process.env.PHIZ_ROBOT_ID;
  const r = await listarRobos();
  const id = r.list?.[0]?.robotId;
  if (!id) throw new ErroOpenAPI("Nenhum robô autorizado pra este appId.");
  return id;
}

/* ── Upload ──────────────────────────────────────────────────────────── */
export type Presign = {
  mediaId: string;
  module: "clips" | "moments";
  mediaType: "image" | "video";
  uploadUrl: string;
  downloadUrl: string;
  uploadHeaders: Record<string, string>;
  coverUploadUrl?: string;
  coverDownloadUrl?: string;
  coverUploadHeaders?: Record<string, string>;
};

export async function pedirUpload(p: {
  module: "clips" | "moments";
  mediaType: "image" | "video";
  fileName: string;
  fileSize: number;
  coverFileSize?: number;
}): Promise<Presign> {
  return chamar("/openapi/v3.0/media/upload/presign", { method: "POST", body: JSON.stringify(p) });
}

/** PUT direto no storage. Sem token aqui (o guia proíbe mandar o token pro storage). */
export async function subir(url: string, headers: Record<string, string>, dados: ArrayBuffer): Promise<void> {
  const r = await fetch(url, { method: "PUT", headers, body: Buffer.from(dados) });
  if (!r.ok) throw new ErroOpenAPI("Upload falhou: HTTP " + r.status, r.status);
}

/**
 * O guia não diz como chegar no objectKey a partir do presign. Assumimos que é
 * o caminho do downloadUrl (sem a barra inicial). Confirmar com a Open Platform.
 */
export function objectKeyDe(downloadUrl: string): string {
  try {
    return decodeURIComponent(new URL(downloadUrl).pathname.replace(/^\/+/, ""));
  } catch {
    return downloadUrl;
  }
}

/* ── Publicar ────────────────────────────────────────────────────────── */
export type ResultadoLote = {
  requestNo: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  failedItems: Array<{ itemIndex: number; submitId?: string; errorMessage?: string; errors?: Array<{ targetType: string; reason: string }> }>;
};

export type MomentoItem = {
  robotId: string;
  content?: string;
  type?: number;
  submitId?: string;
  mediaList?: Array<{ type?: number; okey?: string; tkey?: string; size?: number; width?: number; height?: number; length?: number }>;
};

export async function publicarMomentos(requestNo: string, items: MomentoItem[]): Promise<ResultadoLote> {
  if (!items.length || items.length > 20) throw new ErroOpenAPI("Momentos: lote de 1 a 20 itens.");
  return chamar("/openapi/v3.0/moment/batchPublish", { method: "POST", body: JSON.stringify({ requestNo: requestNo.slice(0, 64), items }) });
}

export type ClipeItem = {
  robotId: string;
  categoryText?: string;
  contentType: "VIDEO";
  caption?: string;
  mediaItems: [{ objectKey: string; coverItems: [{ objectKey: string }]; duration: number; width: number; height: number; sort: 1 }];
};

export async function publicarClipes(requestNo: string, items: ClipeItem[]): Promise<ResultadoLote> {
  if (!items.length || items.length > 100) throw new ErroOpenAPI("Clipes: lote de 1 a 100 itens.");
  return chamar("/openapi/clips/batch/publish", { method: "POST", body: JSON.stringify({ requestNo: requestNo.slice(0, 64), items }) });
}

export async function consultarResultado(requestNo: string) {
  return chamar<{ requestNo: string; total: number; success: number; fail: number; processing: number }>(
    "/openapi/v3.0/common/result?requestNo=" + encodeURIComponent(requestNo),
    { method: "GET" }
  );
}

export const OPENAPI_APP_ID = APP_ID;
