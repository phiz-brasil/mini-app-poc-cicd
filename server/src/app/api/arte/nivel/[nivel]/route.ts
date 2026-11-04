import { arteNivel } from "@/lib/arte-nivel";
import { fotoValida } from "@/lib/mini-sessao";
import { lerBanco } from "@/lib/store";
import { xpDe, nivelDe } from "@/lib/niveis";

/** Arte de subida de nível por link assinado: /api/arte/nivel/<nivel>.png?u=<uid>&e&s. Só vale nível já alcançado. */
export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ nivel: string }> }) {
  const nivel = Number(String((await ctx.params).nivel || "").replace(/\.png$/i, ""));
  const q = new URL(req.url).searchParams, uid = q.get("u") || "";
  if (!Number.isFinite(nivel) || !fotoValida(`nivel/${uid}/${nivel}`, q.get("e"), q.get("s"))) return new Response("Não encontrado.", { status: 404 });
  const b = await lerBanco();
  const u = b.usuarios[uid];
  const xp = xpDe(b, uid);
  if (!u || nivelDe(xp).nivel < nivel) return new Response("Não encontrado.", { status: 404 });
  const img = await arteNivel({ nome: u.nome, nivel, xp });
  return new Response(await img.arrayBuffer(), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" } });
}
