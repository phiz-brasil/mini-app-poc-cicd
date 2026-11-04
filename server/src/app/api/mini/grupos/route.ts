import { NextResponse } from "next/server";
import { convidarAmigos, criarGrupo, editarGrupo, entrarNoGrupo, meusGrupos, phizIdsDoGrupo, responderConvite, sairDoGrupo } from "@/lib/grupos";
import { exigir, falha } from "../_util";

/** GET: meus grupos. POST { acao: "criar"|"entrar"|"sair"|"convidar"|"quem"|"responder", … } */
export async function GET(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try { return NextResponse.json({ ok: true, grupos: await meusGrupos(uid) }); } catch (e) { return falha(e); }
}

export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { acao?: string; nome?: string; metrica?: string; codigo?: string; id?: string; amigos?: { phizId: string; nome?: string }[]; aceitar?: boolean; inicio?: string; fim?: string };
    if (b.acao === "editar") return NextResponse.json({ ok: true, grupo: await editarGrupo(uid, String(b.id || ""), { nome: b.nome, metrica: b.metrica, ...("inicio" in b ? { inicio: b.inicio || "" } : {}), ...("fim" in b ? { fim: b.fim || "" } : {}) }) });
    if (b.acao === "convidar") return NextResponse.json({ ok: true, ...(await convidarAmigos(uid, String(b.id || ""), b.amigos || [])) });
    if (b.acao === "quem") return NextResponse.json({ ok: true, ...(await phizIdsDoGrupo(uid, String(b.id || ""))) });
    if (b.acao === "responder") return NextResponse.json({ ok: true, ...(await responderConvite(uid, String(b.id || ""), !!b.aceitar)) });
    if (b.acao === "criar") return NextResponse.json({ ok: true, grupo: await criarGrupo(uid, String(b.nome || ""), String(b.metrica || ""), b.inicio ? String(b.inicio) : undefined, b.fim ? String(b.fim) : undefined) });
    if (b.acao === "entrar") return NextResponse.json({ ok: true, ...(await entrarNoGrupo(uid, String(b.codigo || ""))) });
    if (b.acao === "sair") { await sairDoGrupo(uid, String(b.id || "")); return NextResponse.json({ ok: true }); }
    return NextResponse.json({ ok: false, erro: "Ação inválida." }, { status: 400 });
  } catch (e) {
    return falha(e);
  }
}
