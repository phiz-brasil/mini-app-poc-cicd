import { fundoDoCard } from "@/lib/mapa";
import { ROTA_DEMO } from "../trajeto/rota";

/** Prévia pública do fundo do card com mapa (caminho inventado no Ibirapuera, sem dado de ninguém). */
export const runtime = "nodejs";

export async function GET() {
  const img = await fundoDoCard(ROTA_DEMO);
  if (!img) return new Response("Sem mapa.", { status: 502 });
  return new Response(new Uint8Array(img), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300" } });
}
