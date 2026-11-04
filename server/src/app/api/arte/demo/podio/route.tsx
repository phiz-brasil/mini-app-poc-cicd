import { artePodio } from "@/lib/arte-podio";

/** Prévia pública do pódio de domingo, com nomes inventados. */
export const runtime = "nodejs";

export async function GET() {
  return artePodio({ titulo: "Corre da Firma", semana: "19 a 25 out", top: [
    { nome: "Ana", valor: "6", un: "dias" }, { nome: "Bruno", valor: "5", un: "dias", eu: true }, { nome: "Carla", valor: "4", un: "dias" },
  ] });
}
