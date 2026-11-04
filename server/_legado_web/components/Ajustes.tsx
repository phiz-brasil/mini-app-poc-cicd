"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UsuarioPublico as Usuario } from "@/lib/store";

function Chave({ on, onClick, rotulo }: { on: boolean; onClick: () => void; rotulo: string }) {
  return <button role="switch" aria-checked={on} aria-label={rotulo} className={"sw" + (on ? " on" : "")} onClick={onClick}><i /></button>;
}

export function Ajustes({ usuario }: { usuario: Usuario }) {
  const router = useRouter();
  const [u, setU] = useState(usuario);
  const mudar = async (patch: Partial<Pick<Usuario, "aparecer" | "destaques">>) => {
    setU(x => ({ ...x, ...patch }));
    await fetch("/api/ajustes", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    router.refresh();
  };
  const sair = async () => { await fetch("/api/sair", { method: "POST" }); router.push("/entrar"); };
  return (
    <main className="tela branca">
      <nav className="barra">
        <Link href="/" className="voltar" aria-label="Voltar">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        </Link>
        <b>Ajustes</b>
      </nav>
      <h2 className="sec">No ranking</h2>
      <div className="lc" onClick={() => mudar({ aparecer: !u.aparecer })}>
        <span className="lc-tx"><b>Aparecer pros outros</b><span>Desligado, você vê o ranking mas some dele</span></span>
        <Chave on={u.aparecer} rotulo="Aparecer pros outros" onClick={() => {}} />
      </div>
      <h2 className="sec">Destaques</h2>
      <div className="lc" onClick={() => mudar({ destaques: !u.destaques })}>
        <span className="lc-tx"><b>Entrar nos destaques do Tá Pago!</b><span>A conta oficial posta seu treino com foto nos Momentos</span></span>
        <Chave on={u.destaques} rotulo="Entrar nos destaques" onClick={() => {}} />
      </div>
      <div className="pad"><button className="perigo" onClick={sair}>Sair do Tá Pago!</button></div>
    </main>
  );
}
