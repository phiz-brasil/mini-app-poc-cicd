import { arteNivel } from "@/lib/arte-nivel";

/** Prévia pública da arte de nível (nome de exemplo): ?n=12 */
export const runtime = "nodejs";

export async function GET(req: Request) {
  const n = Math.max(1, Math.min(100, Number(new URL(req.url).searchParams.get("n")) || 12));
  return arteNivel({ nome: "Ana Souza", nivel: n });
}
