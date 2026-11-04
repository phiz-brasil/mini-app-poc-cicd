import { createHmac, randomBytes } from "node:crypto";
import type { Banco } from "./store";

/**
 * Identidade de quem usa o Tá Pago!.
 *
 * O id interno (`u_…`) é aleatório e não abre nada: pode aparecer em ranking, link de foto e perfil.
 * O que prova QUEM é a pessoa nunca sai do servidor: a chave do aparelho (login de teste) ou o
 * openId da PhizClip ficam guardados só como HMAC em `Usuario.chave`.
 * (Antes de 27/10/2026 o id era "dev_" + chave do aparelho, então quem visse o id conseguia entrar.)
 *
 * Como a chave do aparelho antiga pode ter sido vista, o app agora manda também um `segredo` que
 * nasce e fica só no celular. Na 1ª entrada com ele, o servidor amarra o segredo à conta; daí em
 * diante a chave do aparelho sozinha não entra mais. Com LOGIN_EXIGE_SEGREDO=1, entrada sem segredo
 * é recusada pra todo mundo (ligar quando a versão nova do miniapp estiver publicada).
 */
function segredo() {
  const s = process.env.TAPAGO_SESSION_SECRET;
  if (!s) throw new Error("TAPAGO_SESSION_SECRET ausente.");
  return s;
}

export const novoUid = () => "u_" + randomBytes(12).toString("base64url").replace(/[^a-zA-Z0-9]/g, "x");

/** HMAC da credencial de login ("dev:<id do aparelho>" ou "pz:<openId>"). */
export const chaveDe = (credencial: string) => createHmac("sha256", "login:" + segredo()).update(credencial).digest("base64url");

export const segredoDe = (s: string) => createHmac("sha256", "segredo:" + segredo()).update(s).digest("base64url");

export function uidPelaChave(b: Banco, chave: string): string | undefined {
  return Object.values(b.usuarios).find(u => u.chave === chave)?.id;
}
