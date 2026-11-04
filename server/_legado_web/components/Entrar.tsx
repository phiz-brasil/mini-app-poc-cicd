"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "./Logo";

/**
 * Só existe no beta. Dentro do PhizChat a pessoa já está logada e esta tela
 * some (ver src/lib/sessao.ts).
 */
export function Entrar() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIndo(true); setErro(null);
    const r = await fetch("/api/entrar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErro(j.erro || "Não deu pra entrar."); setIndo(false); return; }
    router.push("/"); router.refresh();
  };
  return (
    <main className="tela entrar">
      <header className="entrar-hero">
        <div className="hero-marca"><Logo size={64} raio={20} claro /><span>Tá Pago!</span></div>
        <h1>Treinou, tá pago.</h1>
        <p>Registre o treino com uma foto e veja quem está treinando com você.</p>
      </header>
      <form className="entrar-form" onSubmit={entrar}>
        <label>
          <span>Como te chamam?</span>
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" maxLength={40} autoFocus />
        </label>
        {erro && <p className="erro">{erro}</p>}
        <button className="btn" disabled={indo || nome.trim().length < 2}>{indo ? "Entrando…" : "Começar"}</button>
        <p className="nota">Versão de teste. No PhizChat você entra direto com a sua conta.</p>
      </form>
    </main>
  );
}
