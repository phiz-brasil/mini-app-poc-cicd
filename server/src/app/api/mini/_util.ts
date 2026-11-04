import { NextResponse } from "next/server";
import { ErroAcao } from "@/lib/acoes";
import { lerToken } from "@/lib/mini-sessao";

/** Quem chamou (token do miniapp) ou resposta 401. */
export function exigir(req: Request): string | NextResponse {
  const uid = lerToken(req);
  return uid || NextResponse.json({ ok: false, erro: "Sessão vencida." }, { status: 401 });
}

export function falha(e: unknown) {
  if (e instanceof ErroAcao) return NextResponse.json({ ...e.extra, ok: false, erro: e.message }, { status: e.status });
  console.error("[mini]", e);
  return NextResponse.json({ ok: false, erro: "Erro no servidor." }, { status: 500 });
}

export const origem = (req: Request) => {
  const u = new URL(req.url);
  return `${req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "")}://${req.headers.get("x-forwarded-host") || u.host}`;
};
