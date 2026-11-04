import { alterarBanco, publico } from "@/lib/store";
import { NextResponse } from "next/server";
import { marcarNivelVisto, marcarVitoriaVista, mudarAjustes } from "@/lib/acoes";
import { marcarConquistaVista } from "@/lib/conquistas-acoes";
import { exigir, falha } from "../_util";

/**
 * Nome, aparecer no ranking, perfil público e avisos no chat.
 * Avisos: desligar só marca o descadastro (o telefone fica guardado pra se a pessoa voltar);
 * ligar sem telefone = "quero receber" (entra na lista do admin pra alguém pôr o telefone).
 * { avisosAgoraNao: true } = tocou em "Agora não" na folha de avisos.
 */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { nome?: string; aparecer?: boolean; destaques?: boolean; avisos?: boolean; perfilPublico?: boolean; vitoriaVista?: string; avisosAgoraNao?: boolean; nivelVisto?: number; conquistaVista?: string };
    if (typeof b.vitoriaVista === "string") { await marcarVitoriaVista(uid, b.vitoriaVista); return NextResponse.json({ ok: true }); }
    if (typeof b.conquistaVista === "string") { await marcarConquistaVista(uid, b.conquistaVista.slice(0, 60)); return NextResponse.json({ ok: true }); }
    if (typeof b.nivelVisto === "number") { await marcarNivelVisto(uid, b.nivelVisto); return NextResponse.json({ ok: true }); }
    const agora = new Date().toISOString();
    if (b.avisosAgoraNao) {
      await alterarBanco(x => { const y = x.usuarios[uid]; if (y) y.avisosPerguntaEm = agora; });
      return NextResponse.json({ ok: true });
    }
    if (typeof b.avisos === "boolean") {
      const u = await alterarBanco(x => {
        const y = x.usuarios[uid];
        if (!y) return y;
        if (b.avisos === false) { y.avisos = false; y.avisosSaiuEm = agora; }
        else { y.avisos = true; delete y.avisosSaiuEm; if (!y.telefone && !y.querAvisos) y.querAvisos = agora; }
        return y;
      });
      return NextResponse.json({ ok: true, usuario: u ? publico(u) : null });
    }
    const usuario = await mudarAjustes(uid, b);
    return NextResponse.json({ ok: true, usuario: publico(usuario) });
  } catch (e) {
    return falha(e);
  }
}
