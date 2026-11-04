import { NextResponse } from "next/server";
import { FRAMES } from "@/lib/arte-frame";
import { guardarFotoFrame } from "@/lib/moments";
import { urlFrame } from "@/lib/mini-sessao";
import { exigir, falha, origem } from "../../_util";

export const maxDuration = 30;

/** pz.uploadFile: foto nova → id + os 3 frames do Tá Pago! prontos. */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const f = (await req.formData()).get("foto");
    if (!(f instanceof File)) return NextResponse.json({ ok: false, erro: "Cadê a foto?" }, { status: 400 });
    const id = await guardarFotoFrame(uid, await f.arrayBuffer());
    const o = origem(req);
    return NextResponse.json({ ok: true, id, frames: FRAMES.map(fr => ({ frame: fr, arte: urlFrame(o, uid, id, fr) })) });
  } catch (e) {
    return falha(e);
  }
}
