import { NextResponse } from "next/server";
import { apagarConta } from "@/lib/apagar-conta";
import { exigir, falha } from "../_util";

export const maxDuration = 60;

/** { acao: "apagar", confirma: "APAGAR" } → apaga a conta e tudo da pessoa (ver lib/apagar-conta.ts). */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { acao?: string; confirma?: string };
    if (b.acao !== "apagar" || b.confirma !== "APAGAR") return NextResponse.json({ ok: false, erro: "Confirmação faltando." }, { status: 400 });
    const r = await apagarConta(uid);
    console.log("[conta] apagada", { fotos: r.fotos });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return falha(e);
  }
}
