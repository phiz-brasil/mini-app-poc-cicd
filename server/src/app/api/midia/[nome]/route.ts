import { lerMidia } from "@/lib/midia";

/** Imagem enviada no admin (badge, enfeite, card). Pública: é arte de campanha, nada pessoal. */
export async function GET(_req: Request, ctx: { params: Promise<{ nome: string }> }) {
  const nome = String((await ctx.params).nome || "");
  if (!/^[\w.-]{1,80}$/.test(nome)) return new Response("Não encontrado.", { status: 404 });
  const m = await lerMidia(nome);
  if (!m) return new Response("Não encontrado.", { status: 404 });
  return new Response(m.dados, { headers: { "Content-Type": m.tipo, "Cache-Control": "public, max-age=31536000, immutable" } });
}
