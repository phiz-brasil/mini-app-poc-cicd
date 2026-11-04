import { cookies } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import { FASES, lerRegua } from "@/lib/regua";
import { lerMetricas } from "@/lib/metricas";
import { lerBanco } from "@/lib/store";
import Editor from "./Editor";
import "../admin.css";
import "./regua.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tá Pago! · Régua", robots: { index: false, follow: false } };

export default async function Regua() {
  if (!cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value)) redirect("/admin");
  const [passos, m, b] = await Promise.all([lerRegua(), lerMetricas(), lerBanco()]);
  // Envios dos últimos 30 dias por tipo (métricas + histórico antigo guardado em cada pessoa).
  const desde = new Date(Date.now() - 30 * 86400000).toISOString();
  const envios: Record<string, number> = {};
  const inicio = m.envios[0]?.em || "9999";
  Object.values(b.usuarios).forEach(u => (u.mensagens || []).forEach(x => { if (x.em < inicio && x.em >= desde) { const k = x.tipo.startsWith("domingo") ? "domingo" : x.tipo; envios[k] = (envios[k] || 0) + 1; } }));
  m.envios.forEach(e => { if (e.em >= desde) envios[e.tipo] = (envios[e.tipo] || 0) + 1; });
  const alcance = Object.values(b.usuarios).filter(u => u.telefone && u.avisos !== false).length;
  return (
    <main className="adm rg">
      <header className="topo">
        <div className="marca">TÁ PAGO! <span>admin</span></div>
        <nav className="secoes">
          <a href="/admin">Números</a>
          <a href="/admin/niveis">Níveis</a>
          <a className="on" href="/admin/regua">Régua</a>
          <a href="/admin/campanhas">Campanhas</a>
          <a href="/admin/avisos">Avisos</a>
          <a href="/admin/tecnico">Como funciona</a>
        </nav>
      </header>
      <section>
        <h1>Régua de comunicação</h1>
        <p className="lead">Todas as mensagens que o Tá Pago! manda no chat, na ordem em que a pessoa vive o app.</p>
        <ul className="rg-legenda">
          <li><span className="tag-ar">No ar</span>O servidor já envia. Editar o texto e salvar muda a próxima mensagem.</li>
          <li><span className="tag-off">Pausada</span>Está programada, mas não envia. Use a chave do lado direito e depois Salvar pra pausar ou voltar a enviar.</li>
          <li><span className="tag-plan">Planejada · falta programar</span>O texto está pronto, mas o envio ainda não existe no servidor. Pra colocar no ar, peça pra programar o gatilho; não dá pra ligar por aqui.</li>
        </ul>
        <p className="nota">Hoje {alcance} {alcance === 1 ? "pessoa pode" : "pessoas podem"} receber mensagens (têm telefone e não desligaram os avisos). Limite do bot: cerca de 10 mensagens por pessoa por dia.</p>
      </section>
      <Editor inicial={passos} fases={FASES} envios={envios} />
    </main>
  );
}
