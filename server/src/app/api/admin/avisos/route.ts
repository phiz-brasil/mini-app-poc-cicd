import { after, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import { alterarBanco } from "@/lib/store";
import { boasVindas } from "@/lib/mensagens";

/**
 * POST { uid, telefone }: o admin põe o telefone de quem pediu avisos.
 * Quem não tinha telefone e não saiu dos avisos recebe as boas-vindas na hora (régua: "Boas-vindas").
 */
export async function POST(req: Request) {
  if (!cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value)) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { uid?: string; telefone?: string };
  const tel = String(b.telefone || "").replace(/[\s().-]/g, "");
  if (!/^\+\d{10,15}$/.test(tel)) return NextResponse.json({ ok: false, erro: "Use o formato +55, DDD e número, sem espaços." }, { status: 400 });
  const r = await alterarBanco(x => {
    const u = x.usuarios[String(b.uid || "")];
    if (!u) return null;
    const novo = !u.telefone;
    u.telefone = tel;
    if (u.avisos !== false) u.avisos = true;
    delete u.querAvisos;
    return { u: { ...u }, novo };
  });
  if (!r) return NextResponse.json({ ok: false, erro: "Pessoa não encontrada." }, { status: 404 });
  if (r.novo && r.u.avisos !== false) after(() => boasVindas(r.u).catch(e => console.error("[admin/avisos]", e)));
  return NextResponse.json({ ok: true, boasVindas: r.novo && r.u.avisos !== false });
}
