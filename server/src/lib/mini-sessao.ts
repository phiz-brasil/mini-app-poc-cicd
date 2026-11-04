import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sessão do miniapp nativo.
 *
 * O miniapp não tem cookie confiável: ele guarda um token em
 * pz.setStorageSync e manda em Authorization: Bearer. O token é
 * "uid.expira.assinatura" (HMAC-SHA256 com TAPAGO_SESSION_SECRET), então o
 * cliente não consegue inventar um uid — quem cria o token é este servidor,
 * depois de trocar o code do pz.login.
 *
 * A mesma chave assina a URL das fotos: <image src> não manda header, então a
 * foto vai por link assinado que vence.
 */

const DIAS_SESSAO = 30;

function chave(): string {
  const s = process.env.TAPAGO_SESSION_SECRET;
  if (!s) throw new Error("TAPAGO_SESSION_SECRET ausente.");
  return s;
}
const assina = (txt: string) => createHmac("sha256", chave()).update(txt).digest("base64url");
const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function criarToken(uid: string): string {
  const exp = Math.floor(Date.now() / 1000) + DIAS_SESSAO * 86400;
  const base = `${uid}.${exp}`;
  return `${base}.${assina(base)}`;
}

export function lerToken(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [uid, exp, sig] = t.split(".");
  if (!uid || !exp || !sig) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  // Só ids aleatórios ("u_…"): tokens do formato antigo caem e o app entra de novo sozinho.
  if (!uid.startsWith("u_")) return null;
  return igual(sig, assina(`${uid}.${exp}`)) ? uid : null;
}

/** Link assinado da foto (vale 7 dias). */
export function urlFoto(origem: string, key: string): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  return `${origem}/api/f/${key}?e=${exp}&s=${assina(key + "." + exp)}`;
}

/** Link assinado da arte de um treino (vale 7 dias): vai no chat e na folha do Strava. */
export function urlArte(origem: string, treinoId: string): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  return `${origem}/api/arte/treino/${treinoId}.png?e=${exp}&s=${assina("arte/" + treinoId + "." + exp)}`;
}

/** Link assinado do mapa de fundo do card (estável por dia, pra ficar em cache). */
export function urlMapa(origem: string, treinoId: string): string {
  const exp = (Math.floor(Date.now() / 86400000) + 8) * 86400;
  return `${origem}/api/arte/mapa/${treinoId}.png?v=5&e=${exp}&s=${assina("mapa/" + treinoId + "." + exp)}`;
}

/** Link assinado do pódio da semana (chave = "geral" ou id do grupo; uid = pra quem é). */
export function urlPodio(origem: string, chave: string, uid: string, semana = ""): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  const k = `podio/${chave}/${uid}/${semana}`;
  return `${origem}/api/arte/podio/${chave}.png?u=${uid}&w=${semana}&e=${exp}&s=${assina(k + "." + exp)}`;
}

/** Link assinado da arte do campeão (vitoriaId). */
export function urlCampeao(origem: string, vitoriaId: string): string {
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  return `${origem}/api/arte/campeao/${vitoriaId}.png?e=${exp}&s=${assina("campeao/" + vitoriaId + "." + exp)}`;
}

/** Link assinado da arte de subida de nível (vale 30 dias). */
/** Arte de conquista (badge) da pessoa, pra salvar e postar. */
export function urlConquista(origem: string, uid: string, id: string): string {
  const exp = (Math.floor(Date.now() / 86400000) + 31) * 86400;
  return `${origem}/api/arte/conquista/${encodeURIComponent(id)}.png?u=${encodeURIComponent(uid)}&e=${exp}&s=${assina(`conquista/${uid}/${id}.` + exp)}&v=1`;
}

export function urlNivel(origem: string, uid: string, nivel: number): string {
  const exp = (Math.floor(Date.now() / 86400000) + 31) * 86400;
  // v = versão do desenho: muda quando a arte muda, pra o celular e a CDN não mostrarem a antiga.
  return `${origem}/api/arte/nivel/${nivel}.png?u=${encodeURIComponent(uid)}&e=${exp}&s=${assina(`nivel/${uid}/${nivel}.` + exp)}&v=3`;
}

/** Link assinado da foto com frame do Tá Pago! (pros Moments). */
export function urlFrame(origem: string, uid: string, id: string, frame: string): string {
  const exp = Math.floor(Date.now() / 1000) + 7 * 86400;
  return `${origem}/api/arte/frame/${id}.png?u=${uid}&f=${frame}&e=${exp}&s=${assina(`frame/${uid}/${id}/${frame}.${exp}`)}`;
}

export function fotoValida(key: string, e: string | null, s: string | null): boolean {
  if (!e || !s || Number(e) < Date.now() / 1000) return false;
  return igual(s, assina(key + "." + e));
}
