import { arteCampeao } from "@/lib/arte-campeao";

/** Prévia pública da arte do campeão, com dados inventados. Em dev, ?avatar=<url> testa com foto. */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const av = process.env.NODE_ENV !== "production" ? new URL(req.url).searchParams.get("avatar") || undefined : undefined;
  return arteCampeao({ nome: "Ana Souza", avatar: av, titulo: "Corre da Firma", semana: "13 a 19 out", valor: "6", un: "dias", membros: 8, total: 3, genero: 2 });
}
