import { arteMomento } from "@/lib/arte";
import { miniMapa } from "@/lib/mapa";
import { ROTA_DEMO } from "../trajeto/rota";

/** Prévia pública da arte com foto (foto de exemplo gerada, sem dado de ninguém). */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const comMapa = new URL(req.url).searchParams.get("mapa") === "1";
  // "Foto" de exemplo: um degradê com textura, só pra ver o layout por cima.
  const foto = "data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c8a6e"/><stop offset=".5" stop-color="#3f4a3a"/><stop offset="1" stop-color="#1d221b"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><circle cx="800" cy="380" r="260" fill="#a9b493" opacity=".35"/><rect x="120" y="520" width="520" height="40" rx="20" fill="#d9d9d0" opacity=".5"/><rect x="160" y="470" width="40" height="140" rx="12" fill="#d9d9d0" opacity=".5"/><rect x="560" y="470" width="40" height="140" rx="12" fill="#d9d9d0" opacity=".5"/></svg>`).toString("base64");
  return arteMomento({ nome: "Fillip Bayer", foto, min: 52, tipo: comMapa ? "Corrida" : "Musculação", titulo: comMapa ? "Ibira run" : "Treino de perna", pos: 2, seq: 5, pontos: 20, quando: "ter, 20 out", miniMapa: comMapa ? await miniMapa(ROTA_DEMO) : undefined });
}
