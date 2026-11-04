"use client";

import { useState } from "react";

export type Linha = {
  uid: string; nome: string; phizId: string; entrou: string;
  status: "pediu" | "recebe" | "saiu" | "nao-pediu"; pediuEm: string; saiuEm: string; temTelefone: boolean;
};

const ROTULO = { pediu: "Pediu, sem telefone", recebe: "Recebendo", saiu: "Saiu dos avisos", "nao-pediu": "Ainda não pediu" };
const quando = (iso: string) => iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function Lista({ linhas: iniciais }: { linhas: Linha[] }) {
  const [linhas, setLinhas] = useState(iniciais);
  const [filtro, setFiltro] = useState<Linha["status"] | "todos">("pediu");
  const [tel, setTel] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [copiado, setCopiado] = useState(false);

  const conta = (s: Linha["status"]) => linhas.filter(l => l.status === s).length;
  const visiveis = filtro === "todos" ? linhas : linhas.filter(l => l.status === filtro);

  const salvar = async (l: Linha) => {
    setMsg(m => ({ ...m, [l.uid]: "Salvando…" }));
    const r = await fetch("/api/admin/avisos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ uid: l.uid, telefone: tel[l.uid] || "" }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { setMsg(m => ({ ...m, [l.uid]: j.erro || "Não deu pra salvar." })); return; }
    setMsg(m => ({ ...m, [l.uid]: j.boasVindas ? "Salvo. Boas-vindas enviada ✓" : "Telefone salvo ✓" }));
    setLinhas(ls => ls.map(x => (x.uid === l.uid ? { ...x, temTelefone: true, status: x.status === "saiu" ? "saiu" : "recebe" } : x)));
  };

  const copiarIds = async () => {
    const ids = linhas.filter(l => l.status === "pediu").map(l => `${l.nome}\t${l.phizId || "(sem PhizID)"}`).join("\n");
    await navigator.clipboard.writeText("Nome\tPhizID\n" + ids);
    setCopiado(true); setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <section>
      <div className="av-filtros">
        {(["pediu", "recebe", "saiu", "nao-pediu"] as const).map(s => (
          <button key={s} type="button" className={filtro === s ? "on" : ""} onClick={() => setFiltro(s)}>{ROTULO[s]} <b>{conta(s)}</b></button>
        ))}
        <button type="button" className={filtro === "todos" ? "on" : ""} onClick={() => setFiltro("todos")}>Todos <b>{linhas.length}</b></button>
        <button type="button" className="av-copiar" onClick={copiarIds}>{copiado ? "Copiado ✓" : "Copiar PhizIDs de quem pediu"}</button>
      </div>
      <div className="card rolar">
        <table className="tab">
          <thead><tr><th>Nome</th><th>PhizID</th><th>Situação</th><th>Pediu em</th><th>Telefone</th><th /></tr></thead>
          <tbody>
            {visiveis.length ? visiveis.map(l => (
              <tr key={l.uid}>
                <td>{l.nome}</td>
                <td className="mono">{l.phizId || "—"}</td>
                <td><span className={"av-st " + l.status}>{ROTULO[l.status]}</span>{l.status === "saiu" ? <span className="av-sub"> em {quando(l.saiuEm)}</span> : null}</td>
                <td>{quando(l.pediuEm)}</td>
                <td>
                  {l.temTelefone ? <span className="av-ok">Telefone guardado</span> : (
                    <input className="av-in" placeholder="+55 DDD número" value={tel[l.uid] || ""} onChange={e => setTel(t => ({ ...t, [l.uid]: e.target.value }))} onKeyDown={e => { if (e.key === "Enter") salvar(l); }} />
                  )}
                </td>
                <td>{!l.temTelefone ? <button type="button" className="av-salvar" onClick={() => salvar(l)}>Salvar</button> : null}{msg[l.uid] ? <span className="av-msg">{msg[l.uid]}</span> : null}</td>
              </tr>
            )) : <tr><td colSpan={6} className="av-vazio">Ninguém aqui ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
