import { cookies } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import { lerBanco } from "@/lib/store";
import Lista, { type Linha } from "./Lista";
import "../admin.css";
import "./avisos.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tá Pago! · Avisos", robots: { index: false, follow: false } };

export default async function Avisos() {
  if (!cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value)) redirect("/admin");
  const b = await lerBanco();
  const linhas: Linha[] = Object.values(b.usuarios).map(u => ({
    uid: u.id, nome: u.nome, phizId: u.phizId || "", entrou: u.criadoEm,
    status: (u.avisos === false ? "saiu" : u.telefone ? "recebe" : u.querAvisos ? "pediu" : "nao-pediu") as Linha["status"],
    pediuEm: u.querAvisos || "", saiuEm: u.avisosSaiuEm || "", temTelefone: !!u.telefone,
  }));
  const ordem = { pediu: 0, recebe: 1, saiu: 2, "nao-pediu": 3 };
  linhas.sort((a, c) => ordem[a.status] - ordem[c.status] || (c.pediuEm || c.entrou).localeCompare(a.pediuEm || a.entrou));
  return (
    <main className="adm avs">
      <header className="topo">
        <div className="marca">TÁ PAGO! <span>admin</span></div>
        <nav className="secoes">
          <a href="/admin">Números</a>
          <a href="/admin/niveis">Níveis</a>
          <a href="/admin/regua">Régua</a>
          <a href="/admin/campanhas">Campanhas</a>
          <a className="on" href="/admin/avisos">Avisos</a>
          <a href="/admin/tecnico">Como funciona</a>
        </nav>
      </header>
      <section>
        <h1>Avisos no chat</h1>
        <p className="lead">Quem pediu pra receber mensagens do Tá Pago! no chat. O PhizChat ainda não entrega o telefone pro miniapp, então a gente coloca à mão: ponha o telefone, salve, e a pessoa recebe as boas-vindas na hora. Quem sai dos avisos não perde o telefone: se voltar, já está tudo aqui.</p>
      </section>
      <Lista linhas={linhas} />
    </main>
  );
}
