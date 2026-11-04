import { lerFoto } from "@/lib/store";
import { uidAtual } from "@/lib/sessao";

/** Serve a foto do treino a partir do store privado (só pra quem está no miniapp). */
export async function GET(_req: Request, ctx: { params: Promise<{ k: string[] }> }) {
  if (!(await uidAtual())) return new Response("Sem sessão.", { status: 401 });
  const { k } = await ctx.params;
  const key = k.join("/");
  if (!key.startsWith("tapago/fotos/") || key.includes("..")) return new Response("Não encontrado.", { status: 404 });
  const f = await lerFoto(key);
  if (!f) return new Response("Não encontrado.", { status: 404 });
  return new Response(f.stream, { headers: { "Content-Type": f.contentType, "Cache-Control": "private, max-age=31536000, immutable" } });
}
