import { NextResponse } from "next/server";
import { alterarBanco } from "@/lib/store";
import { definirSessao, novoId } from "@/lib/sessao";

/** Login de teste do beta (ver src/lib/sessao.ts). */
export async function POST(req: Request) {
  const { nome } = (await req.json().catch(() => ({}))) as { nome?: string };
  const n = String(nome || "").trim().replace(/\s+/g, " ").slice(0, 40);
  if (n.length < 2) return NextResponse.json({ erro: "Digite seu nome." }, { status: 400 });
  const id = novoId();
  await alterarBanco(b => {
    b.usuarios[id] = { id, nome: n, criadoEm: new Date().toISOString(), aparecer: true, destaques: false };
  });
  await definirSessao(id);
  return NextResponse.json({ ok: true });
}
