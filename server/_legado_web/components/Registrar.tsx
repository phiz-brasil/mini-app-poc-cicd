"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MANUAL_MAX_DIA, MIN_MAX, MIN_MIN, TIPOS } from "@/lib/tipos";

/** Reduz a foto no aparelho (lado maior 1600, JPEG 0,85) e devolve as medidas. */
async function prepararFoto(f: File): Promise<{ blob: Blob; w: number; h: number; url: string }> {
  const img = await createImageBitmap(f).catch(() => null);
  if (!img) return { blob: f, w: 0, h: 0, url: URL.createObjectURL(f) };
  const k = Math.min(1, 1600 / Math.max(img.width, img.height));
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  const blob: Blob = await new Promise(r => c.toBlob(b => r(b || f), "image/jpeg", 0.85));
  return { blob, w, h, url: URL.createObjectURL(blob) };
}

export function Registrar({ destaques }: { destaques: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<{ blob: Blob; w: number; h: number; url: string; hora: string } | null>(null);
  const [tipo, setTipo] = useState("funcional");
  const [min, setMin] = useState(45);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const escolheu = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setErro(null);
    const p = await prepararFoto(f);
    setFoto({ ...p, hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
  };

  const registrar = async () => {
    if (!foto || enviando) return;
    setEnviando(true); setErro(null);
    const fd = new FormData();
    fd.append("foto", foto.blob, "treino.jpg");
    fd.append("tipo", tipo); fd.append("min", String(min));
    fd.append("w", String(foto.w)); fd.append("h", String(foto.h));
    const r = await fetch("/api/treinos", { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErro(j.erro || "Não deu pra registrar agora."); setEnviando(false); return; }
    router.push("/?ok=1&d=" + (j.treino?.destaque?.status || ""));
    router.refresh();
  };

  return (
    <main className="tela branca">
      <nav className="barra">
        <Link href="/" className="voltar" aria-label="Voltar">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
        </Link>
        <b>Registrar treino</b>
      </nav>

      <div className={"cam" + (foto ? " tem" : "")} onClick={() => !foto && input.current?.click()} role={foto ? undefined : "button"}>
        {foto ? <img src={foto.url} alt="Foto do treino" /> : (
          <div className="cam-vazia">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/></svg>
            <b>Tire a foto do treino</b>
            <span>Sem foto, o treino à mão não entra</span>
          </div>
        )}
        <div className="cam-pe">
          <span className="tag">{foto ? "Agora · " + foto.hora : "Foto na hora"}</span>
          {foto
            ? <button className="refazer" onClick={(e) => { e.stopPropagation(); input.current?.click(); }}>Tirar outra</button>
            : <span className="disparo" aria-hidden><i /></span>}
        </div>
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={escolheu} />
      </div>

      <h2 className="sec">O que você fez</h2>
      <div className="chips">
        {TIPOS.map(([k, l]) => <button key={k} className={"chip" + (tipo === k ? " on" : "")} onClick={() => setTipo(k)}>{l}</button>)}
      </div>

      <h2 className="sec">Quanto tempo</h2>
      <div className="pad">
        <div className="stepper">
          <button onClick={() => setMin(m => Math.max(MIN_MIN, m - 5))} aria-label="Menos 5 min">−</button>
          <b>{min} min</b>
          <button onClick={() => setMin(m => Math.min(MIN_MAX, m + 5))} aria-label="Mais 5 min">+</button>
        </div>
        <p className="nota">Treino à mão conta até {MANUAL_MAX_DIA} min por dia. A foto aparece no ranking pra quem também usa o Tá Pago!.
          {destaques ? " Você está nos destaques: a conta oficial pode postar esse treino nos Momentos." : ""}</p>
        {erro && <p className="erro">{erro}</p>}
      </div>

      <div className="rodape">
        <button className="btn" disabled={!foto || enviando} onClick={registrar}>
          {enviando ? "Registrando…" : foto ? "Registrar treino" : "Tire a foto pra registrar"}
        </button>
      </div>
    </main>
  );
}
