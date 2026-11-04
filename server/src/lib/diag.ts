import { get, put } from "@vercel/blob";

/**
 * Diagnóstico do login no PhizChat: o que o pz.login e as APIs de perfil
 * devolveram — só NOMES de campo e o apiserver, nunca valores pessoais.
 * Guarda as 30 últimas entradas em tapago/diag.json (store privado).
 */
const KEY = "tapago/diag.json";

export async function registrarDiag(entrada: Record<string, unknown>) {
  let lista: unknown[] = [];
  try {
    const r = await get(KEY, { access: "private", useCache: false });
    if (r && r.statusCode === 200 && r.stream) lista = JSON.parse(await new Response(r.stream).text());
  } catch {}
  lista = [entrada, ...(Array.isArray(lista) ? lista : [])].slice(0, 30);
  await put(KEY, JSON.stringify(lista), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
}
