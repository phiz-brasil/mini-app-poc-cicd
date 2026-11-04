import { cookies } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import { lerCampanhas } from "@/lib/campanhas";
import { lerBanco } from "@/lib/store";
import Editor from "./Editor";
import "../admin.css";
import "../regua/regua.css";
import "./campanhas.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tá Pago! · Campanhas", robots: { index: false, follow: false } };

export default async function Campanhas() {
  if (!cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value)) redirect("/admin");
  const [c, b] = await Promise.all([lerCampanhas(), lerBanco()]);
  const ganharam: Record<string, number> = {};
  Object.values(b.usuarios).forEach(u => (u.conquistas || []).forEach(x => { ganharam[x.id] = (ganharam[x.id] || 0) + 1; }));
  const pessoas = Object.values(b.usuarios).map(u => ({ id: u.id, nome: u.nome || "Atleta", tem: (u.conquistas || []).map(x => x.id) })).sort((a, z) => a.nome.localeCompare(z.nome));
  return (
    <main className="adm rg cp">
      <header className="topo">
        <div className="marca">TÁ PAGO! <span>admin</span></div>
        <nav className="secoes">
          <a href="/admin">Números</a>
          <a href="/admin/niveis">Níveis</a>
          <a href="/admin/regua">Régua</a>
          <a className="on" href="/admin/campanhas">Campanhas</a>
          <a href="/admin/avisos">Avisos</a>
          <a href="/admin/tecnico">Como funciona</a>
        </nav>
      </header>
      <section>
        <h1>Campanhas</h1>
        <p className="lead">Conquistas (badges) e temas do dia. Tudo aqui vale na hora, sem atualizar o miniapp: o app só desenha o que o servidor manda.</p>
        <ul className="rg-legenda">
          <li><span className="tag-ar">Conquista</span>Fica no perfil da pessoa pra sempre. Regra: todo mundo até uma data, quem treinou entre duas datas, ou só quem você der. Quem ganha vê a comemoração no app e, se foi por treino, recebe a arte no chat.</li>
          <li><span className="tag-plan">Tema</span>Entre duas datas muda o card da home, mostra uma faixa no topo e põe um enfeite nos avatares. Testadores veem antes da data.</li>
        </ul>
      </section>
      <Editor inicial={c} ganharam={ganharam} pessoas={pessoas} />
    </main>
  );
}
