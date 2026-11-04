import { get, put } from "@vercel/blob";

/** Imagens que o admin envia (badges, enfeites, fundos de card): ficam no Blob e saem por /api/midia/<nome>. */
export const absoluto = (origem: string, p?: string) => (!p ? "" : /^https?:/.test(p) ? p : origem + p);

export async function salvarMidia(nome: string, dados: ArrayBuffer, tipo: string) {
  await put(`tapago/midia/${nome}`, Buffer.from(dados), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: tipo, cacheControlMaxAge: 31536000 });
  return `/api/midia/${nome}`;
}

export async function lerMidia(nome: string) {
  const r = await get(`tapago/midia/${nome}`, { access: "private" }).catch(() => null);
  if (!r || r.statusCode !== 200 || !r.stream) return null;
  return { dados: await new Response(r.stream).arrayBuffer(), tipo: r.blob.contentType || "image/png" };
}
