import { arteConquista } from "@/lib/arte-conquista";
import { lerCampanhas } from "@/lib/campanhas";
import { fotoValida } from "@/lib/mini-sessao";
import { lerBanco } from "@/lib/store";
import { origem } from "../../../mini/_util";

/** Arte de conquista por link assinado: /api/arte/conquista/<id>.png?u=<uid>&e&s. Só de conquista que a pessoa tem. */
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = decodeURIComponent(String((await ctx.params).id || "")).replace(/\.png$/i, "");
  const q = new URL(req.url).searchParams, uid = q.get("u") || "";
  if (!fotoValida(`conquista/${uid}/${id}`, q.get("e"), q.get("s"))) return new Response("Não encontrado.", { status: 404 });
  const [b, { conquistas }] = await Promise.all([lerBanco(), lerCampanhas()]);
  const u = b.usuarios[uid], c = conquistas.find(x => x.id === id), minha = u?.conquistas?.find(x => x.id === id);
  if (!u || !c || !minha) return new Response("Não encontrado.", { status: 404 });
  const img = await arteConquista({ nome: u.nome, c, origem: origem(req), em: minha.em });
  return new Response(await img.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
