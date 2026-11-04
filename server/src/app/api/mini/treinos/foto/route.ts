import { NextResponse } from "next/server";
import { fotoNoTreino } from "@/lib/acoes";
import { exigir, falha } from "../../_util";

export const maxDuration = 60;

/** pz.uploadFile: foto num treino que já existe (Strava). formData { treinoId }. 422 = foto recusada. */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const form = await req.formData();
    const f = form.get("foto");
    if (!(f instanceof File)) return NextResponse.json({ ok: false, erro: "Cadê a foto?" }, { status: 400 });
    let tipo = f.type;
    if (!/^image\//.test(tipo)) { const n = f.name.toLowerCase(); tipo = n.endsWith(".png") ? "image/png" : n.endsWith(".webp") ? "image/webp" : "image/jpeg"; }
    const r = await fotoNoTreino(uid, String(form.get("treinoId") || ""), { dados: await f.arrayBuffer(), tipo });
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return falha(e);
  }
}
