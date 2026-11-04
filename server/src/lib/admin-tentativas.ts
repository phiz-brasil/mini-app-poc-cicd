import { get, put } from "@vercel/blob";

/**
 * Freio de chute de senha do admin: 5 erros em 15 min por IP bloqueiam aquele IP por 15 min.
 * Fica no Blob (as funções da Vercel não guardam memória entre chamadas). Guarda só um hash curto do IP.
 */
const KEY = "tapago/admin-tentativas.json";
const JANELA = 15 * 60 * 1000, LIMITE = 5;

type Reg = Record<string, number[]>;

async function ler(): Promise<Reg> {
  try {
    const r = await get(KEY, { access: "private", useCache: false });
    if (r && r.statusCode === 200 && r.stream) return JSON.parse(await new Response(r.stream).text());
  } catch {}
  return {};
}

async function chaveIp(ip: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("ip:" + ip + (process.env.TAPAGO_SESSION_SECRET || "")));
  return Buffer.from(d).toString("base64url").slice(0, 16);
}

export async function bloqueado(ip: string): Promise<boolean> {
  const r = await ler(), k = await chaveIp(ip), agora = Date.now();
  return (r[k] || []).filter(t => agora - t < JANELA).length >= LIMITE;
}

export async function anotarErro(ip: string) {
  const r = await ler(), k = await chaveIp(ip), agora = Date.now();
  for (const x of Object.keys(r)) { r[x] = r[x].filter(t => agora - t < JANELA); if (!r[x].length) delete r[x]; }
  r[k] = [...(r[k] || []), agora];
  await put(KEY, JSON.stringify(r), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
}
