import { arteFrame } from "@/lib/arte-frame";
import { dadosFrame, ehFrame } from "@/lib/moments";
import { fotoValida } from "@/lib/mini-sessao";
import { lerBanco } from "@/lib/store";

/** Foto com frame do Tá Pago!, por link assinado. */
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = String((await ctx.params).id || "").replace(/\.png$/i, "");
  const q = new URL(req.url).searchParams;
  const uid = q.get("u") || "", f = q.get("f") || "";
  if (!ehFrame(f) || !fotoValida(`frame/${uid}/${id}/${f}`, q.get("e"), q.get("s"))) return new Response("Não encontrado.", { status: 404 });
  const d = await dadosFrame(await lerBanco(), uid, id);
  if (!d) return new Response("Não encontrado.", { status: 404 });
  const img = await arteFrame(f, d);
  return new Response(await img.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}
