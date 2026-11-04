import { NextResponse } from "next/server";
import { alterarBanco } from "@/lib/store";
import { uidAtual } from "@/lib/sessao";
import { diaSP } from "@/lib/tipos";

/** Dar "tá pago" pra alguém (uma vez por pessoa por dia). */
export async function POST(req: Request) {
  const uid = await uidAtual();
  if (!uid) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  const { para } = (await req.json().catch(() => ({}))) as { para?: string };
  if (!para || para === uid) return NextResponse.json({ erro: "Inválido." }, { status: 400 });
  const dia = diaSP();
  const ok = await alterarBanco(b => {
    if (!b.usuarios[para]) return false;
    if (b.tapagos.some(x => x.de === uid && x.para === para && x.dia === dia)) return true;
    b.tapagos.push({ de: uid, para, dia, em: new Date().toISOString() });
    return true;
  });
  if (!ok) return NextResponse.json({ erro: "Pessoa não encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
