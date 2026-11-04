import { arteMomento } from "@/lib/arte";

/** Prévia pública da arte do Momento, com dados de exemplo e sem foto de ninguém. */
export const runtime = "nodejs";

export async function GET() {
  return arteMomento({ nome: "Fillip Bayer", min: 52, tipo: "Bike", titulo: "Bike SP", km: 12.5, pos: 2, total: 8, seq: 5, pontos: 20, quando: "ter, 20 out" });
}
