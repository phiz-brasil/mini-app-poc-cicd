import { arteMomento } from "@/lib/arte";
import { mapaDaArte } from "@/lib/mapa";
import { ROTA_DEMO } from "./rota";

/** Prévia pública da arte com trajeto (caminho inventado, sem dado de ninguém). */
export const runtime = "nodejs";

export async function GET() {
  const rota = ROTA_DEMO;
  const mapa = await mapaDaArte(rota);
  return arteMomento({ nome: "Fillip Bayer", min: 39, tipo: "Corrida", titulo: "Ibira run", strava: true, km: 6, pos: 1, seq: 3, pontos: 23, quando: "sáb, 11 out", rota, mapa, lugar: "Vila Mariana · São Paulo" });
}
