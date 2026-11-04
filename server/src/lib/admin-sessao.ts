import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Acesso ao /admin: senha única do time (env ADMIN_SENHA) → cookie assinado por 30 dias.
 * Assinado com TAPAGO_SESSION_SECRET (o mesmo segredo do miniapp, com outro prefixo).
 */
export const COOKIE_ADMIN = "tp_admin";
const DIAS = 30;

function assinar(txt: string) {
  return createHmac("sha256", "admin:" + (process.env.TAPAGO_SESSION_SECRET || "")).update(txt).digest("base64url");
}

function igual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function senhaConfere(senha: string): boolean {
  const certa = process.env.ADMIN_SENHA || "";
  return !!certa && igual(senha, certa);
}

export function novoCookieAdmin(): { valor: string; maxAge: number } {
  const exp = String(Math.floor(Date.now() / 1000) + DIAS * 86400);
  return { valor: exp + "." + assinar(exp), maxAge: DIAS * 86400 };
}

export function cookieAdminOk(valor?: string): boolean {
  if (!valor || !process.env.TAPAGO_SESSION_SECRET) return false;
  const [exp, sig] = valor.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return igual(sig, assinar(exp));
}
