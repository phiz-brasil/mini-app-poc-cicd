import { arteFrame, FRAMES, type Frame } from "@/lib/arte-frame";

/** Prévia pública dos frames, com uma "foto" de exemplo gerada. ?f=selo|faixa|moldura */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const f = (new URL(req.url).searchParams.get("f") || "selo") as Frame;
  const foto = "data:image/svg+xml;base64," + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c8a6e"/><stop offset=".5" stop-color="#3f4a3a"/><stop offset="1" stop-color="#1d221b"/></linearGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><circle cx="780" cy="420" r="260" fill="#a9b493" opacity=".35"/><rect x="120" y="620" width="520" height="40" rx="20" fill="#d9d9d0" opacity=".5"/><rect x="160" y="570" width="40" height="140" rx="12" fill="#d9d9d0" opacity=".5"/><rect x="560" y="570" width="40" height="140" rx="12" fill="#d9d9d0" opacity=".5"/></svg>`).toString("base64");
  return arteFrame(FRAMES.includes(f) ? f : "selo", { foto, quando: "ter, 21 out", nome: "Fillip", treino: "Musculação", min: 52, pontos: 20 });
}
