import { after, NextResponse } from "next/server";
import { avisarConquistas, avisarTreino } from "@/lib/mensagens";
import { posicaoAgora, registrarTreino, resumoDepois } from "@/lib/acoes";
import { urlArte } from "@/lib/mini-sessao";
import { exigir, falha, origem } from "../_util";

export const maxDuration = 60;

/** pz.uploadFile: arquivo em "foto" + formData { tipo, min, w, h }. */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const posAntes = await posicaoAgora(uid);
    const form = await req.formData();
    const f = form.get("foto");
    // pz.uploadFile às vezes manda octet-stream: o tipo vem da extensão.
    let tipo = f instanceof File ? f.type : "";
    if (f instanceof File && !/^image\//.test(tipo)) {
      const n = f.name.toLowerCase();
      tipo = n.endsWith(".png") ? "image/png" : n.endsWith(".webp") ? "image/webp" : "image/jpeg";
    }
    const treino = await registrarTreino(uid, {
      foto: f instanceof File ? { dados: await f.arrayBuffer(), tipo, nome: f.name } : null,
      tipo: String(form.get("tipo") || ""),
      min: Number(form.get("min")),
      km: Number(form.get("km")) || undefined,
      w: Number(form.get("w")) || undefined,
      h: Number(form.get("h")) || undefined,
      visivel: (() => { try { return JSON.parse(String(form.get("visivel") || "")); } catch { return undefined; } })(),
    });
    after(async () => {
      await avisarTreino(uid, treino).catch(e => console.error("[aviso treino]", e));
      await avisarConquistas(uid).catch(e => console.error("[conquistas]", e));
    });
    return NextResponse.json({ ok: true, treino, arte: urlArte(origem(req), treino.id), resumo: await resumoDepois(uid, posAntes) });
  } catch (e) {
    return falha(e);
  }
}
