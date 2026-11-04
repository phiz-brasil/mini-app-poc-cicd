import { NextResponse } from "next/server";
import { editarTreino } from "@/lib/acoes";
import { exigir, falha } from "../../_util";

/** { id, titulo?, visivel? }: editar título e quem pode ver (folha do Strava, Eu). */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { id?: string; titulo?: string; visivel?: { geral?: unknown; grupos?: unknown } };
    return NextResponse.json({ ok: true, ...(await editarTreino(uid, String(b.id || ""), { titulo: b.titulo, visivel: b.visivel })) });
  } catch (e) {
    return falha(e);
  }
}
