import { decodificar } from "./arte";
import { lugarDe } from "./mapa";
import { registrarEvento } from "./metricas";
import { createHmac, timingSafeEqual } from "node:crypto";
import { alterarBanco, lerBanco, type Treino, type Usuario } from "./store";
import { diaSP } from "./tipos";
import { novoId } from "./acoes";
import { avisarConquistas, avisarStrava } from "./mensagens";

/**
 * Strava → Tá Pago!
 *
 *   1. Ajustes do miniapp → "Conectar Strava" → abre /api/strava/conectar?t=…
 *      (ticket assinado de 10 min com o uid) → redireciona pro OAuth do Strava.
 *   2. Strava volta em /api/strava/callback → trocamos o code por tokens,
 *      guardamos no usuário e importamos os treinos de hoje.
 *   3. Daí em diante o webhook (/api/strava/webhook) avisa cada atividade nova.
 *
 * Garmin: quem usa Garmin pode ligar a sincronização Garmin Connect → Strava
 * (nativa no app da Garmin) e o treino chega por aqui. A integração direta com
 * a Garmin depende de aprovação no Garmin Connect Developer Program.
 *
 * ATENÇÃO (termos da API do Strava, nov/2024): dados de um atleta só podem ser
 * mostrados pra ele mesmo. Mostrar no ranking pra outras pessoas precisa de
 * conversa/autorização com o Strava antes de abrir pra todo mundo.
 */

const AUTH = "https://www.strava.com/oauth/authorize";
const TOKEN = "https://www.strava.com/api/v3/oauth/token";
const API = "https://www.strava.com/api/v3";

export function stravaConfigurado(): boolean {
  return Boolean(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);
}

/* ── Ticket (uid assinado, 10 min) pra atravessar o navegador ──────────── */
const chave = () => process.env.TAPAGO_SESSION_SECRET || "";
const sig = (t: string) => createHmac("sha256", chave()).update("strava:" + t).digest("base64url");
/** Ticket assinado do OAuth: 10 min no web-view; 30 min quando a pessoa abre no navegador (copia e cola). */
export function criarTicket(uid: string, minutos = 10): string {
  const base = `${uid}.${Math.floor(Date.now() / 1000) + minutos * 60}`;
  return `${base}.${sig(base)}`;
}
export function lerTicket(t: string | null): string | null {
  const [uid, exp, s] = String(t || "").split(".");
  if (!uid || !exp || !s || Number(exp) < Date.now() / 1000) return null;
  const esperado = sig(`${uid}.${exp}`);
  return s.length === esperado.length && timingSafeEqual(Buffer.from(s), Buffer.from(esperado)) ? uid : null;
}

export function urlAutorizar(origem: string, ticket: string): string {
  const q = new URLSearchParams({
    client_id: String(process.env.STRAVA_CLIENT_ID),
    redirect_uri: `${origem}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read",
    state: ticket,
  });
  return `${AUTH}?${q}`;
}

type Tokens = { access_token: string; refresh_token: string; expires_at: number; athlete?: { id: number; firstname?: string; lastname?: string } };

async function pedirToken(corpo: Record<string, string>): Promise<Tokens> {
  const r = await fetch(TOKEN, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: process.env.STRAVA_CLIENT_ID, client_secret: process.env.STRAVA_CLIENT_SECRET, ...corpo }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error("Strava recusou: " + (j.message || r.status));
  return j as Tokens;
}

/** Callback do OAuth: guarda os tokens e importa o dia de hoje. */
export async function conectar(uid: string, code: string): Promise<{ importados: number; nome: string }> {
  const t = await pedirToken({ code, grant_type: "authorization_code" });
  if (!t.athlete?.id) throw new Error("Strava não devolveu o atleta.");
  const nome = [t.athlete.firstname, t.athlete.lastname].filter(Boolean).join(" ");
  await alterarBanco(b => {
    // Um atleta do Strava só pode estar ligado a uma pessoa.
    Object.values(b.usuarios).forEach(u => { if (u.strava?.athleteId === t.athlete!.id && u.id !== uid) delete u.strava; });
    const u = b.usuarios[uid];
    if (!u) throw new Error("Usuário não encontrado.");
    u.strava = { athleteId: t.athlete!.id, accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at, conectadoEm: new Date().toISOString(), nome };
  });
  await registrarEvento("strava-conectou", uid);
  const importados = await importarDesde(uid, inicioDeHojeSP());
  return { importados, nome };
}

export async function desconectar(uid: string) {
  const b = await lerBanco();
  const tok = b.usuarios[uid]?.strava?.accessToken;
  if (tok) await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { authorization: "Bearer " + tok } }).catch(() => {});
  await alterarBanco(x => { if (x.usuarios[uid]) delete x.usuarios[uid].strava; });
  await registrarEvento("strava-desconectou", uid);
}

/** Access token válido (renova se faltar menos de 1 h). */
async function tokenDe(u: Usuario): Promise<string> {
  if (!u.strava) throw new Error("Strava não conectado.");
  if (u.strava.expiresAt - Date.now() / 1000 > 3600) return u.strava.accessToken;
  const t = await pedirToken({ refresh_token: u.strava.refreshToken, grant_type: "refresh_token" });
  await alterarBanco(b => {
    const x = b.usuarios[u.id];
    if (x?.strava) Object.assign(x.strava, { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at });
  });
  return t.access_token;
}

/* ── Atividade → treino ──────────────────────────────────────────────── */
const TIPO: Record<string, string> = {
  Run: "corrida", TrailRun: "corrida", VirtualRun: "corrida", Walk: "caminhada", Hike: "caminhada",
  Ride: "bike", VirtualRide: "bike", MountainBikeRide: "bike", GravelRide: "bike", EBikeRide: "bike",
  Swim: "natacao", WeightTraining: "muscu", Crossfit: "funcional", Workout: "funcional", HighIntensityIntervalTraining: "funcional",
  Yoga: "yoga", Pilates: "yoga", Soccer: "futebol", Boxing: "luta", MartialArts: "luta",
};

type Atividade = {
  id: number; name: string; sport_type?: string; type?: string; moving_time: number; elapsed_time: number; distance: number; start_date: string; manual?: boolean;
  map?: { summary_polyline?: string; polyline?: string }; average_heartrate?: number; calories?: number; total_elevation_gain?: number; photos?: { primary?: { urls?: Record<string, string> } };
};

function paraTreino(uid: string, a: Atividade): Treino | null {
  const min = Math.round((a.moving_time || a.elapsed_time || 0) / 60);
  if (min < 1) return null;
  return {
    id: novoId(), uid, dia: diaSP(new Date(a.start_date)), tipo: TIPO[a.sport_type || a.type || ""] || "outro",
    min, fonte: "strava", externoId: "strava:" + a.id, titulo: a.name, distanciaM: Math.round(a.distance || 0),
    inicioEm: a.start_date,
    fc: a.average_heartrate ? Math.round(a.average_heartrate) : undefined,
    kcal: a.calories ? Math.round(a.calories) : undefined,
    elevM: a.total_elevation_gain ? Math.round(a.total_elevation_gain) : undefined,
    polyline: a.map?.summary_polyline || a.map?.polyline || undefined,
    fotoExterna: a.photos?.primary?.urls?.["600"] || a.photos?.primary?.urls?.["100"] || undefined,
    // Regra do Tá Pago!: treino à mão só com foto. Lançado à mão no Strava entra esperando a foto.
    pendenteFoto: a.manual ? true : undefined,
    criadoEm: new Date().toISOString(),
  };
}

async function guardar(ts: Treino[]): Promise<number> {
  if (!ts.length) return 0;
  // Bairro/cidade pro card com mapa (Nominatim: 1 pedido por treino com trajeto).
  for (const t of ts) {
    if (!t.polyline || t.lugar) continue;
    try { const r = decodificar(t.polyline); const m = r[Math.floor(r.length / 2)]; if (m) t.lugar = (await lugarDe(m[0], m[1])) || undefined; } catch { /* sem lugar */ }
  }
  const novos = await alterarBanco(b => {
    const ja = new Set(b.treinos.map(t => t.externoId).filter(Boolean));
    const n: Treino[] = [];
    for (const t of ts.filter(x => !ja.has(x.externoId))) {
      // Não duplicar: se a pessoa já registrou esse treino à mão (com foto) entre o começo da atividade e
      // 3 h depois do fim, junta os dois — fica a foto + o que veio do Strava, e conta uma vez só.
      const ini = Date.parse(t.inicioEm || "") || 0;
      const fim = ini + t.min * 60_000 + 3 * 3600_000;
      const mao = ini ? b.treinos.find(m => m.uid === t.uid && m.fonte === "manual" && !m.externoId && Date.parse(m.criadoEm) >= ini && Date.parse(m.criadoEm) <= fim) : undefined;
      if (mao) {
        Object.assign(mao, { externoId: t.externoId, titulo: mao.titulo || t.titulo, inicioEm: t.inicioEm, polyline: t.polyline, distanciaM: mao.distanciaM || t.distanciaM, fc: t.fc, kcal: t.kcal, elevM: t.elevM, lugar: t.lugar });
        continue;
      }
      b.treinos.push(t);
      n.push(t);
    }
    return n;
  });
  // Mensagem no chat pra cada treino novo do Strava (nunca derruba a importação).
  for (const t of novos) await avisarStrava(t.uid, t).catch(e => console.error("[strava/aviso]", e));
  // Treino novo pode dar conquista (ex.: treinou no Halloween): avisa no chat.
  for (const uid of new Set(novos.map(t => t.uid))) await avisarConquistas(uid).catch(e => console.error("[strava/conquistas]", e));
  return novos.length;
}

function inicioDeHojeSP(): number {
  // Meia-noite de São Paulo (UTC-3), em segundos.
  const d = diaSP();
  return Math.floor(Date.parse(d + "T00:00:00-03:00") / 1000);
}

export async function importarDesde(uid: string, depoisDe: number): Promise<number> {
  const b = await lerBanco();
  const u = b.usuarios[uid];
  if (!u?.strava) return 0;
  const tok = await tokenDe(u);
  const r = await fetch(`${API}/athlete/activities?after=${depoisDe}&per_page=30`, { headers: { authorization: "Bearer " + tok }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("Strava: " + r.status);
  const lista = (await r.json()) as Atividade[];
  // Lançada à mão no Strava entra esperando foto (paraTreino marca pendenteFoto).
  return guardar(lista.map(a => paraTreino(uid, a)).filter((t): t is Treino => !!t));
}

/** Link da atividade no Strava ("View on Strava", exigido pelas regras de marca). */
export const urlNoStrava = (externoId?: string) => (externoId?.startsWith("strava:") ? "https://www.strava.com/activities/" + externoId.slice(7) : "");

/** Webhook: uma atividade nova (ou apagada) de um atleta conectado. */
/**
 * O webhook do Strava é público (o Strava não assina os eventos). Então:
 *   · só aceita eventos da nossa assinatura (STRAVA_SUBSCRIPTION_ID);
 *   · "apagou" e "desconectou" são conferidos na API do Strava antes de mexer em algo —
 *     um evento forjado não apaga treino nem desliga ninguém.
 */
export async function eventoWebhook(ev: { object_type: string; aspect_type: string; object_id: number; owner_id: number; subscription_id?: number; updates?: Record<string, string> }) {
  const sub = process.env.STRAVA_SUBSCRIPTION_ID;
  if (sub && String(ev.subscription_id) !== sub) { console.warn("[strava/webhook] assinatura desconhecida", ev.subscription_id); return; }
  const b = await lerBanco();
  const u = Object.values(b.usuarios).find(x => x.strava?.athleteId === ev.owner_id);
  if (ev.object_type === "athlete" && ev.updates?.authorized === "false") {
    if (!u?.strava) return;
    // Confere: se o token ainda renova, o atleta não desconectou (evento forjado).
    // (o token novo é guardado: o Strava pode trocar o refresh token a cada renovação)
    const ainda = await pedirToken({ refresh_token: u.strava.refreshToken, grant_type: "refresh_token" }).then(async t => {
      await alterarBanco(x => { const y = x.usuarios[u.id]; if (y?.strava) Object.assign(y.strava, { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: t.expires_at }); });
      return true;
    }, () => false);
    if (ainda) { console.warn("[strava/webhook] desconexão não confirmada", ev.owner_id); return; }
    await alterarBanco(x => { if (x.usuarios[u.id]) delete x.usuarios[u.id].strava; });
    await registrarEvento("strava-desconectou", u.id, "pelo-strava");
    return;
  }
  if (!u || ev.object_type !== "activity") return;
  if (ev.aspect_type === "delete") {
    // Confere: a atividade tem que ter sumido mesmo do Strava.
    const tok = await tokenDe(u).catch(() => "");
    if (tok) {
      const r = await fetch(`${API}/activities/${ev.object_id}`, { headers: { authorization: "Bearer " + tok }, signal: AbortSignal.timeout(15000) }).catch(() => null);
      if (r && r.ok) { console.warn("[strava/webhook] apagar não confirmado", ev.object_id); return; }
    }
    await alterarBanco(x => { x.treinos = x.treinos.filter(t => t.externoId !== "strava:" + ev.object_id); });
    return;
  }
  if (ev.aspect_type !== "create") return;
  const tok = await tokenDe(u);
  const r = await fetch(`${API}/activities/${ev.object_id}`, { headers: { authorization: "Bearer " + tok }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) { console.error("[strava/webhook] atividade", ev.object_id, r.status); return; }
  const a = (await r.json()) as Atividade;
  const t = paraTreino(u.id, a);
  if (t) await guardar([t]);
}

/**
 * Regra do Strava (API Policy: cache de até 7 dias): treino do Strava com mais de 7 dias perde o
 * detalhe (título, tipo, trajeto, foto do Strava). Ficam só a duração e a distância, que somam os pontos.
 * Roda todo dia junto do resumo das 17h.
 */
export async function limparStravaAntigo(): Promise<number> {
  const limite = new Date(Date.now() - 7 * 86400000).toISOString();
  return alterarBanco(b => {
    let n = 0;
    for (const t of b.treinos) {
      if (t.fonte !== "strava" || t.criadoEm >= limite) continue;
      if (!t.titulo && !t.polyline && !t.fotoExterna && t.tipo === "outro") continue;
      delete t.titulo; delete t.polyline; delete t.fotoExterna; delete t.fc; delete t.kcal; delete t.elevM; delete t.lugar;
      t.tipo = "outro";
      n++;
    }
    return n;
  });
}
