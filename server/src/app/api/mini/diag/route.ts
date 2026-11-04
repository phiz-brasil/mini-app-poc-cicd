import { NextResponse } from "next/server";
import { registrarDiag } from "@/lib/diag";
import { exigir } from "../_util";

/** Testes no aparelho (ex.: o que o finchatShare do PhizChat responde). Guarda no diag.json. */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  const b = (await req.json().catch(() => ({}))) as { evento?: string; dados?: unknown };
  const dados = JSON.stringify(b.dados ?? null).slice(0, 4000);
  await registrarDiag({ em: new Date().toISOString(), evento: String(b.evento || "").slice(0, 60), dados }).catch(() => {});
  console.log("[mini/diag]", b.evento, dados.slice(0, 500));
  return NextResponse.json({ ok: true });
}
