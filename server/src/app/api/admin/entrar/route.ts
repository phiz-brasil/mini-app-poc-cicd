import { NextResponse } from "next/server";
import { COOKIE_ADMIN, novoCookieAdmin, senhaConfere } from "@/lib/admin-sessao";
import { anotarErro, bloqueado } from "@/lib/admin-tentativas";

/** POST (formulário) { senha } → cookie do admin e volta pro /admin. */
export async function POST(req: Request) {
  const f = await req.formData().catch(() => null);
  const senha = String(f?.get("senha") || "");
  const base = new URL(req.url).origin;
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  if (await bloqueado(ip)) return NextResponse.redirect(base + "/admin?erro=2", 303);
  if (!senhaConfere(senha)) {
    await anotarErro(ip);
    await new Promise(r => setTimeout(r, 800)); // freia chute de senha
    return NextResponse.redirect(base + "/admin?erro=1", 303);
  }
  const c = novoCookieAdmin();
  const r = NextResponse.redirect(base + "/admin", 303);
  r.cookies.set(COOKIE_ADMIN, c.valor, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: c.maxAge });
  return r;
}
