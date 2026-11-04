import { NextResponse } from "next/server";
import { registrarTreino, ErroAcao } from "@/lib/acoes";
import { uidAtual } from "@/lib/sessao";

export const maxDuration = 60;

/** Treino à mão pelo site (o miniapp usa /api/mini/treinos). Regras em lib/acoes.ts. */
export async function POST(req: Request) {
  const uid = await uidAtual();
  if (!uid) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ erro: "Envio inválido." }, { status: 400 });
  const f = form.get("foto");
  try {
    const treino = await registrarTreino(uid, {
      foto: f instanceof File && f.size ? { dados: await f.arrayBuffer(), tipo: f.type, nome: f.name } : null,
      tipo: String(form.get("tipo") || ""), min: Number(form.get("min")),
      w: Number(form.get("w")) || undefined, h: Number(form.get("h")) || undefined,
    });
    return NextResponse.json({ ok: true, treino });
  } catch (e) {
    if (e instanceof ErroAcao) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }
}
