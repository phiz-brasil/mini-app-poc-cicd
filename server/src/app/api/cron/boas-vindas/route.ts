import { NextResponse } from "next/server";
import { lerBanco } from "@/lib/store";
import { boasVindas } from "@/lib/mensagens";

export const maxDuration = 300;

/**
 * Disparo manual (protegido pelo CRON_SECRET, sem agendamento): manda a boas-vindas pra quem já
 * tem telefone, não desligou os avisos e ainda não recebeu. Usado quando os telefones entram em lote.
 * `?seco=1` só conta quem receberia. `?so=<uid>` manda de novo só pra essa pessoa (ver como chega).
 */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Proibido", { status: 403 });
  const q = new URL(req.url).searchParams;
  const seco = q.get("seco") === "1", so = q.get("so") || "";
  const b = await lerBanco();
  if (so) {
    const u = b.usuarios[so];
    if (!u || !u.telefone || u.avisos === false) return NextResponse.json({ ok: false, erro: "Sem telefone ou avisos desligados." }, { status: 404 });
    await boasVindas(u);
    const st = ((await lerBanco()).usuarios[so]?.mensagens || []).find(m => m.tipo === "boas-vindas")?.status;
    return NextResponse.json({ ok: true, so: true, status: st });
  }
  const alvo = Object.values(b.usuarios).filter(u => u.telefone && u.avisos !== false && !(u.mensagens || []).some(m => m.tipo === "boas-vindas"));
  if (seco) return NextResponse.json({ ok: true, seco: true, receberiam: alvo.length });
  let enviados = 0;
  for (const u of alvo) { await boasVindas(u).catch(e => console.error("[boas-vindas lote]", e)); enviados++; }
  const depois = await lerBanco();
  const st = alvo.map(u => (depois.usuarios[u.id]?.mensagens || []).find(m => m.tipo === "boas-vindas")?.status || "sem registro");
  const resumo: Record<string, number> = {};
  st.forEach(s => { resumo[s] = (resumo[s] || 0) + 1; });
  return NextResponse.json({ ok: true, tentados: enviados, status: resumo });
}
