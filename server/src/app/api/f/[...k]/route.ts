import { lerFoto } from "@/lib/store";
import { fotoValida } from "@/lib/mini-sessao";

/** Foto por link assinado (o <image> do miniapp não manda header). */
export async function GET(req: Request, ctx: { params: Promise<{ k: string[] }> }) {
  const { k } = await ctx.params;
  const key = k.join("/");
  const u = new URL(req.url);
  if (!key.startsWith("tapago/fotos/") || key.includes("..") || !fotoValida(key, u.searchParams.get("e"), u.searchParams.get("s")))
    return new Response("Não encontrado.", { status: 404 });
  const f = await lerFoto(key);
  if (!f) return new Response("Não encontrado.", { status: 404 });
  return new Response(f.stream, { headers: { "Content-Type": f.contentType, "Cache-Control": "public, max-age=604800, immutable" } });
}
