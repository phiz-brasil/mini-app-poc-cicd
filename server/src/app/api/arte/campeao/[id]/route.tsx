import { arteCampeao } from "@/lib/arte-campeao";
import { dadosCampeao } from "@/lib/domingo";
import { fotoValida } from "@/lib/mini-sessao";
import { lerBanco } from "@/lib/store";

/** A arte do campeão da semana, por link assinado (comemoração no app, Momentos, chat). */
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = String((await ctx.params).id || "").replace(/\.png$/i, "");
  const q = new URL(req.url).searchParams;
  if (!fotoValida("campeao/" + id, q.get("e"), q.get("s"))) return new Response("Não encontrado.", { status: 404 });
  const d = dadosCampeao(await lerBanco(), id);
  if (!d) return new Response("Não encontrado.", { status: 404 });
  const img = await arteCampeao(d);
  return new Response(await img.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}
