import { after, NextResponse } from "next/server";
import { registrarEvento } from "@/lib/metricas";
import { criarTicket, desconectar, importarDesde, stravaConfigurado } from "@/lib/strava";
import { marcarVisto } from "@/lib/acoes";
import { mandarLinkStrava } from "@/lib/mensagens";
import { exigir, falha, origem } from "../_util";

export const maxDuration = 30;

/** { acao: "link" | "sincronizar" | "desconectar" | "visto", id? } */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const { acao, id, navegador } = (await req.json().catch(() => ({}))) as { acao?: string; id?: string; navegador?: boolean };
    if (acao === "visto") { await marcarVisto(uid, String(id || "")); return NextResponse.json({ ok: true }); }
    if (acao === "link") {
      const url = `${origem(req)}/api/strava/conectar?t=${encodeURIComponent(criarTicket(uid, navegador ? 30 : 10))}`;
      after(() => registrarEvento("strava-tentou", uid, navegador ? "navegador" : "app"));
      // Pelo navegador: manda o link no chat (abre fora do web-view); o app copia se não der.
      const chat = navegador && stravaConfigurado() ? await mandarLinkStrava(uid, url) : false;
      return NextResponse.json({ ok: true, configurado: stravaConfigurado(), url, chat });
    }
    if (acao === "sincronizar") return NextResponse.json({ ok: true, importados: await importarDesde(uid, Math.floor(Date.now() / 1000) - 7 * 86400) });
    if (acao === "desconectar") { await desconectar(uid); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ ok: false, erro: "Ação inválida." }, { status: 400 });
  } catch (e) {
    return falha(e);
  }
}
