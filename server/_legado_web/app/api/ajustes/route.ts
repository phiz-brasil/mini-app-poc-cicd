import { NextResponse } from "next/server";
import { alterarBanco, publico } from "@/lib/store";
import { uidAtual } from "@/lib/sessao";

export async function PATCH(req: Request) {
  const uid = await uidAtual();
  if (!uid) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { aparecer?: boolean; destaques?: boolean };
  const u = await alterarBanco(b => {
    const x = b.usuarios[uid];
    if (!x) return null;
    if (typeof body.aparecer === "boolean") x.aparecer = body.aparecer;
    if (typeof body.destaques === "boolean") x.destaques = body.destaques;
    return x;
  });
  if (!u) return NextResponse.json({ erro: "Usuário não encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true, usuario: publico(u) });
}
