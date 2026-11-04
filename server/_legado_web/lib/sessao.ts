import { cookies } from "next/headers";
import { lerBanco, type Usuario } from "./store";

/**
 * QUEM É A PESSOA.
 *
 * Dentro do PhizChat a pessoa já está logada — o miniapp não deve ter tela de
 * login. Assim que o time de plataforma passar a doc do SDK de miniapp, este é
 * o ÚNICO arquivo que muda: em vez do cookie de teste, validar no servidor o
 * código/token que o PhizChat entrega ao abrir o miniapp e usar o id da conta
 * PhizChat como `uid`.
 *
 * Enquanto isso (beta): a pessoa digita o nome uma vez em /entrar e recebe um
 * id aleatório num cookie httpOnly.
 */

const COOKIE = "tp_uid";

export async function uidAtual(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value || null;
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const uid = await uidAtual();
  if (!uid) return null;
  const b = await lerBanco();
  return b.usuarios[uid] || null;
}

export async function definirSessao(uid: string) {
  const c = await cookies();
  c.set(COOKIE, uid, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
}

export async function encerrarSessao() {
  const c = await cookies();
  c.delete(COOKIE);
}

export const novoId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
