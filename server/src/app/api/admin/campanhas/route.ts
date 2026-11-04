import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import { CONQUISTAS_PADRAO, TEMAS_PADRAO, lerCampanhas, salvarCampanhas, type Conquista, type Regra, type Tema } from "@/lib/campanhas";
import { darConquista } from "@/lib/conquistas-acoes";
import { salvarMidia } from "@/lib/midia";

/**
 * Admin de campanhas (só com login do admin):
 *   GET                         → conquistas e temas (padrão + salvos)
 *   POST { acao: "salvar", conquistas, temas }  → grava tudo
 *   POST { acao: "dar", uid, id, dar }          → dá/tira uma conquista de alguém (teste)
 *   POST multipart "imagem"                      → sobe a imagem e devolve o caminho (/api/midia/…)
 */
async function ok() { return cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value); }

const txt = (v: unknown, max: number) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const dia = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v) : "");
const cor = (v: unknown, padrao: string) => (/^#[0-9a-f]{6}$/i.test(String(v)) ? String(v) : padrao);
const css = (v: unknown, padrao: string) => { const s = txt(v, 200); return /^[#\w\s(),.%-]+$/.test(s) && !/url\s*\(|expression/i.test(s) ? s : padrao; };
const img = (v: unknown) => { const s = txt(v, 200); return /^\/(campanhas|api\/midia)\/[\w.-]+$/.test(s) ? s : ""; };
const slug = (v: unknown) => txt(v, 40).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
const uids = (v: unknown) => (Array.isArray(v) ? v.map(x => txt(x, 40)).filter(x => /^u_[\w-]+$/.test(x)).slice(0, 20) : []);

function regra(r: Partial<Regra> & { ate?: string; inicio?: string; fim?: string }): Regra {
  if (r?.tipo === "todos") return { tipo: "todos", ...(dia(r.ate) ? { ate: dia(r.ate) } : {}) };
  if (r?.tipo === "treino" && dia(r.inicio) && dia(r.fim)) return { tipo: "treino", inicio: dia(r.inicio), fim: dia(r.fim) >= dia(r.inicio) ? dia(r.fim) : dia(r.inicio) };
  return { tipo: "manual" };
}

export async function GET() {
  if (!(await ok())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await lerCampanhas()), padraoC: CONQUISTAS_PADRAO.map(c => c.id), padraoT: TEMAS_PADRAO.map(t => t.id) });
}

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ ok: false }, { status: 401 });
  if ((req.headers.get("content-type") || "").includes("multipart/form-data")) {
    const f = (await req.formData()).get("imagem");
    if (!(f instanceof File) || !/^image\/(png|jpeg|webp)$/.test(f.type) || f.size > 3_000_000) return NextResponse.json({ ok: false, erro: "Envie PNG, JPG ou WebP de até 3 MB." }, { status: 400 });
    const nome = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${f.type.split("/")[1].replace("jpeg", "jpg")}`;
    return NextResponse.json({ ok: true, caminho: await salvarMidia(nome, await f.arrayBuffer(), f.type) });
  }
  const b = (await req.json().catch(() => ({}))) as { acao?: string; conquistas?: Partial<Conquista>[]; temas?: Partial<Tema>[]; uid?: string; id?: string; dar?: boolean };
  if (b.acao === "dar") {
    const feito = await darConquista(txt(b.uid, 40), txt(b.id, 40), !!b.dar);
    return NextResponse.json({ ok: feito });
  }
  if (b.acao !== "salvar" || !Array.isArray(b.conquistas) || !Array.isArray(b.temas)) return NextResponse.json({ ok: false, erro: "Nada pra salvar." }, { status: 400 });
  const conquistas: Conquista[] = b.conquistas.slice(0, 100).map((c, i) => ({
    id: slug(c.id) || "conquista-" + Date.now().toString(36), nome: txt(c.nome, 40) || "Nova conquista", descricao: txt(c.descricao, 140),
    imagem: img(c.imagem) || "/campanhas/selo-fundador.png", cor: cor(c.cor, "#C6F432"), edicao: txt(c.edicao, 30) || undefined,
    regra: regra((c.regra || {}) as Regra), mostrarDe: dia(c.mostrarDe) || undefined, ativa: !!c.ativa, mensagem: txt(c.mensagem, 600) || undefined, testadores: uids(c.testadores), ordem: i + 1,
  }));
  const temas: Tema[] = b.temas.slice(0, 50).map(t => ({
    id: slug(t.id) || "tema-" + Date.now().toString(36), nome: txt(t.nome, 40) || "Tema", inicio: dia(t.inicio) || "2099-01-01", fim: dia(t.fim) || dia(t.inicio) || "2099-01-01",
    ativo: !!t.ativo, cor: cor(t.cor, "#C6F432"), testadores: uids(t.testadores),
    faixa: t.faixa && txt(t.faixa.titulo, 60) ? { titulo: txt(t.faixa.titulo, 60), texto: txt(t.faixa.texto, 140), imagem: img(t.faixa.imagem) || undefined, conquista: slug(t.faixa.conquista) || undefined } : undefined,
    card: t.card ? { fundo: css(t.card.fundo, "#C6F432"), imagem: img(t.card.imagem) || undefined, tinta: cor(t.card.tinta, "#111111"), apoio: cor(t.card.apoio, "#3A4A10"),
      barra: css(t.card.barra, "rgba(17,17,17,.14)"), barraOn: cor(t.card.barraOn, "#111111"), botao: cor(t.card.botao, "#111111"), botaoTexto: cor(t.card.botaoTexto, "#FFFFFF") } : undefined,
    enfeite: t.enfeite && img(t.enfeite.imagem) ? { imagem: img(t.enfeite.imagem), x: Number(t.enfeite.x) || 0, y: Number(t.enfeite.y) || 0, w: Math.min(200, Math.max(20, Number(t.enfeite.w) || 100)) } : undefined,
  }));
  await salvarCampanhas({ conquistas, temas });
  return NextResponse.json({ ok: true, ...(await lerCampanhas()) });
}
