"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LinhaRanking } from "@/lib/ranking";
import type { UsuarioPublico as Usuario } from "@/lib/store";
import { Avatar, Logo } from "./Logo";

const Check = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
    <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function Home({ eu, hoje, semana, seq, total, aviso }: {
  eu: Usuario; hoje: LinhaRanking[]; semana: LinhaRanking[]; seq: number; total: number; aviso?: string;
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"hoje" | "semana">("hoje");
  const [dados, setDados] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(aviso || null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => { if (aviso) router.replace("/", { scroll: false }); }, []); // limpa ?ok da URL

  const lista = aba === "hoje" ? hoje : semana;
  const pos = lista.findIndex(r => r.uid === eu.id) + 1;
  const meu = lista.find(r => r.uid === eu.id);

  const darTp = async (r: LinhaRanking) => {
    if (r.uid === eu.id || r.deiTp || dados[r.uid]) return;
    setDados(d => ({ ...d, [r.uid]: true }));
    setToast("Você deu tá pago pra " + r.nome.split(" ")[0]);
    const res = await fetch("/api/tapago", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ para: r.uid }) });
    if (!res.ok) { setDados(d => ({ ...d, [r.uid]: false })); setToast("Não deu certo. Tenta de novo."); }
    else router.refresh();
  };

  return (
    <main className="tela com-botao">
      <header className="hero">
        <div className="hero-in">
          <div className="hero-marca"><Logo size={40} raio={12} claro /><span>Tá Pago!</span></div>
          <div className="hero-eu">
            <Avatar nome={eu.nome} id={eu.id} size={52} />
            <div className="hero-pos"><b>{pos ? pos + "º" : "–"}</b><span>de {Math.max(total, 1)}</span></div>
            <div className="hero-num">
              <b>{meu?.min ?? 0} min</b>
              <span>{seq > 0 ? `${seq} ${seq === 1 ? "dia seguido" : "dias seguidos"} 🔥` : aba === "hoje" ? "hoje" : "nesta semana"}</span>
            </div>
          </div>
        </div>
      </header>

      <section className="folha">
        <div className="abas" role="tablist">
          {(["hoje", "semana"] as const).map(k => (
            <button key={k} role="tab" aria-selected={aba === k} className={aba === k ? "on" : ""} onClick={() => setAba(k)}>
              {k === "hoje" ? "Hoje" : "Semana"}
            </button>
          ))}
          <Link href="/ajustes" className="abas-aj" aria-label="Ajustes">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>
          </Link>
        </div>

        {lista.length <= 1 && (
          <div className="vazio">Por enquanto é só você. Chame quem treina com você pro Tá Pago!.</div>
        )}

        <ol className="lista">
          {lista.map((r, i) => {
            const sou = r.uid === eu.id;
            const dei = r.deiTp || !!dados[r.uid];
            const n = r.tpRecebidos + (dados[r.uid] && !r.deiTp ? 1 : 0);
            const sub = aba === "hoje"
              ? (r.fez || "Ainda não treinou hoje")
              : `${r.dias} ${r.dias === 1 ? "dia" : "dias"} treinando`;
            return (
              <li key={r.uid} className={"linha" + (sou ? " eu" : "")}>
                <span className={"n" + (i < 3 && r.min > 0 ? " top" : "")}>{i + 1}</span>
                <Avatar nome={r.nome} id={r.uid} />
                <span className="tx"><b>{sou ? "Você" : r.nome}</b><span>{sub}</span></span>
                {aba === "hoje" && r.fotoKey && <img className="foto" src={"/api/foto/" + r.fotoKey} alt="Foto do treino" />}
                <span className="min"><b>{r.min}</b><span>min</span></span>
                {aba === "hoje" && (
                  <button className={"tp" + (dei ? " on" : "") + (sou ? " meu" : "")} disabled={sou} onClick={() => darTp(r)}
                    aria-label={sou ? "Tá pagos recebidos" : "Dar tá pago pra " + r.nome}>
                    <Check /><span>{n}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        <p className="nota">Conta minuto de qualquer treino. Treino à mão só entra com foto e vale até 90 min por dia.</p>
      </section>

      <Link href="/registrar" className="botao-reg">
        <span className="ic"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg></span>
        <span className="tx">Registrar treino</span>
        <span className="sub"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg></span>
      </Link>

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
