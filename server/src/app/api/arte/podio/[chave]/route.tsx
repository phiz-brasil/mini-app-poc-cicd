import { artePodio } from "@/lib/arte-podio";
import { podioDe } from "@/lib/domingo";
import { fotoValida } from "@/lib/mini-sessao";
import { lerBanco } from "@/lib/store";

/** Pódio da semana por link assinado (vai no chat no domingo). */
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ chave: string }> }) {
  const chave = String((await ctx.params).chave || "").replace(/\.png$/i, "");
  const q = new URL(req.url).searchParams;
  const uid = q.get("u") || "", w = q.get("w") || "";
  if (!fotoValida(`podio/${chave}/${uid}/${w}`, q.get("e"), q.get("s"))) return new Response("Não encontrado.", { status: 404 });
  // w = segunda da semana; sem w, a semana de agora. O pódio usa o domingo daquela semana.
  let dia: string | undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(w)) { const d = new Date(w + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 6); dia = d.toISOString().slice(0, 10); }
  const p = podioDe(await lerBanco(), chave, uid, dia);
  if (!p) return new Response("Não encontrado.", { status: 404 });
  const img = await artePodio(p);
  return new Response(await img.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=600" } });
}
