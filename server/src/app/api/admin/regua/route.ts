import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import { FASES, PADRAO, lerRegua, salvarRegua, type Passo } from "@/lib/regua";

/** GET: a régua inteira. POST { passos }: grava as edições (só admin). */
async function ok() { return cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value); }

export async function GET() {
  if (!(await ok())) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, passos: await lerRegua() });
}

const limpo = (v: unknown, max: number) => String(v ?? "").replace(/\r/g, "").slice(0, max);

export async function POST(req: Request) {
  if (!(await ok())) return NextResponse.json({ ok: false }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { passos?: Partial<Passo>[] };
  if (!Array.isArray(b.passos)) return NextResponse.json({ ok: false, erro: "Nada pra salvar." }, { status: 400 });
  const agora = new Date().toISOString();
  const atual = await lerRegua();
  const passos: Passo[] = b.passos.slice(0, 80).map(p => {
    const id = limpo(p.id, 40).replace(/[^a-z0-9-]/gi, "") || "passo-" + Math.random().toString(36).slice(2, 8);
    const padrao = PADRAO.find(x => x.id === id);
    const antes = atual.find(x => x.id === id);
    const texto = limpo(p.texto, 1500);
    const mudou = !antes || antes.texto !== texto || antes.ligada !== !!p.ligada || antes.nome !== p.nome || antes.quando !== p.quando || antes.gatilho !== p.gatilho;
    return {
      id, texto, ligada: !!p.ligada,
      fase: FASES.includes(String(p.fase)) ? String(p.fase) : padrao?.fase || "Dia a dia",
      nome: limpo(p.nome, 80) || padrao?.nome || "Novo passo",
      gatilho: limpo(p.gatilho, 200), quando: limpo(p.quando, 80),
      status: padrao?.status || "planejada",
      editadoEm: mudou ? agora : antes?.editadoEm,
    };
  });
  // Passo do padrão que não veio na lista = foi apagado no admin.
  PADRAO.forEach(p => { if (!passos.some(x => x.id === p.id)) passos.push({ ...p, apagado: true, editadoEm: agora }); });
  await salvarRegua(passos);
  return NextResponse.json({ ok: true, passos: await lerRegua() });
}
