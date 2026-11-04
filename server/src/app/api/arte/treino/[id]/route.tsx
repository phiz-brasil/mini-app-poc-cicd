import { arteMomento } from "@/lib/arte";
import { dadosDaArte } from "@/lib/arte-dados";
import { fotoValida } from "@/lib/mini-sessao";
import { lerBanco } from "@/lib/store";

/** A arte de um treino, por link assinado (chat e folha do Strava no miniapp). */
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = String((await ctx.params).id || "").replace(/\.png$/i, "");
  const q = new URL(req.url).searchParams;
  if (!fotoValida("arte/" + id, q.get("e"), q.get("s"))) return new Response("Não encontrado.", { status: 404 });
  const b = await lerBanco();
  const t = b.treinos.find(x => x.id === id);
  const u = t && b.usuarios[t.uid];
  if (!t || !u) return new Response("Não encontrado.", { status: 404 });
  const img = await arteMomento(await dadosDaArte(b, t, u));
  return new Response(await img.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=300" } });
}
