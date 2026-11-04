import { fundoDoCard } from "@/lib/mapa";
import { fotoValida } from "@/lib/mini-sessao";
import { lerBanco } from "@/lib/store";

/**
 * Fundo do card do treino com trajeto (622×356 rpx no app → 1244×712 px):
 * mapa claro sem nomes de rua, tingido do limão do Tá Pago! pro laranja do Strava,
 * e a rota em preto do lado direito (o lado esquerdo fica pro texto).
 */
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = String((await ctx.params).id || "").replace(/\.png$/i, "");
  const q = new URL(req.url).searchParams;
  if (!fotoValida("mapa/" + id, q.get("e"), q.get("s"))) return new Response("Não encontrado.", { status: 404 });
  const t = (await lerBanco()).treinos.find(x => x.id === id);
  if (!t?.polyline) return new Response("Não encontrado.", { status: 404 });
  const img = await fundoDoCard(t.polyline);
  if (!img) return new Response("Sem mapa.", { status: 404 });
  return new Response(new Uint8Array(img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
