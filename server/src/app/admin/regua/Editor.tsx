"use client";

import { useMemo, useRef, useState } from "react";
import type { Passo } from "@/lib/regua";


// Valores de exemplo pra prévia (o servidor preenche os reais na hora de mandar).
const EXEMPLO: Record<string, string> = {
  nome: "Ana", tipo: "Corrida", min: "42", min_dia: "42", pos: "3", total: "18", quem: "Luiz", grupo: "Corre da Firma",
  membros: "6", seq: "4", sequencia: " São 4 dias seguidos.", top3: "\n\n🥇 Luiz · 64 min\n🥈 Você · 42 min\n🥉 Caio · 30 min",
  alvo: " 31 min já te colocam na frente de Caio.", emoji: "🏃", titulo: "Corrida matinal", km: " · 6,2 km", pts: "28",
  posicao: " e está em 3º de 18 na semana.", link: "https://phizchat-tapago.vercel.app/api/strava/conectar?t=…",
  podio: "🥇 Luiz · 5 dias pagos\n🥈 Você · 4 dias pagos\n🥉 Caio · 3 dias pagos", campeao: "Luiz levou a semana.",
  minha: "\n\nVocê ficou em 2º de 6. Semana que vem tem revanche 💪",
};

function previa(texto: string) {
  const v = texto.split(/\n-{3,}\n/)[0] || "";
  return v.replace(/\{(\w+)\}/g, (_, k: string) => EXEMPLO[k] ?? `{${k}}`);
}

export default function Editor({ inicial, fases, envios }: { inicial: Passo[]; fases: string[]; envios: Record<string, number> }) {
  const [passos, setPassos] = useState<Passo[]>(inicial);
  const [salvo, setSalvo] = useState<string>(JSON.stringify(inicial));
  const [estado, setEstado] = useState<"" | "salvando" | "ok" | "erro">("");
  const [aberto, setAberto] = useState<string>("");
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const sujo = useMemo(() => JSON.stringify(passos) !== salvo, [passos, salvo]);

  const mudar = (id: string, campo: keyof Passo, valor: unknown) => {
    setEstado("");
    setPassos(ps => ps.map(p => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  const inserir = (id: string, variavel: string) => {
    const el = refs.current[id];
    const p = passos.find(x => x.id === id);
    if (!p) return;
    const t = `{${variavel}}`;
    const ini = el ? el.selectionStart : p.texto.length, fim = el ? el.selectionEnd : p.texto.length;
    mudar(id, "texto", p.texto.slice(0, ini) + t + p.texto.slice(fim));
    requestAnimationFrame(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = ini + t.length; } });
  };

  const novo = (fase: string) => {
    const id = "novo-" + Math.random().toString(36).slice(2, 8);
    setPassos(ps => [...ps, { id, fase, nome: "Novo passo", gatilho: "", quando: "", texto: "", status: "planejada", ligada: true }]);
    setAberto(id);
  };

  const apagar = (p: Passo) => {
    const aviso = p.status === "no-ar" ? `Apagar "${p.nome}"? Essa mensagem está no ar e para de ser enviada depois de salvar.` : `Apagar "${p.nome}"?`;
    if (confirm(aviso)) { setPassos(ps => ps.filter(x => x.id !== p.id)); setEstado(""); }
  };

  const salvar = async () => {
    setEstado("salvando");
    try {
      const r = await fetch("/api/admin/regua", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passos }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error();
      setPassos(j.passos); setSalvo(JSON.stringify(j.passos)); setEstado("ok");
    } catch { setEstado("erro"); }
  };

  const total = { ar: passos.filter(p => p.status === "no-ar").length, plan: passos.filter(p => p.status === "planejada").length };

  return (
    <>
      <div className="rg-resumo">
        <span><b>{passos.filter(p => p.status === "no-ar" && p.ligada).length}</b> no ar</span>
        <span><b>{total.plan}</b> planejados</span>
        <span><b>{passos.filter(p => p.status === "no-ar" && !p.ligada).length}</b> pausados</span>
      </div>

      {fases.map((fase, fi) => {
        const lista = passos.filter(p => p.fase === fase);
        return (
          <section key={fase} className="rg-fase">
            <div className="rg-fase-cab"><span className="rg-num">{fi + 1}</span><h2>{fase}</h2></div>
            <div className="rg-linha">
              {lista.map(p => {
                const ab = aberto === p.id;
                const plan = p.status === "planejada";
                return (
                  <article key={p.id} className={`rg-passo ${p.ligada ? "" : "off"} ${ab ? "ab" : ""}`}>
                    <span className="rg-ponto" />
                    <header className="rg-cab" onClick={() => setAberto(ab ? "" : p.id)}>
                      <div className="rg-cab-tx">
                        <div className="rg-tit">
                          <span className="rg-nome">{p.nome}</span>
                          {plan ? <span className="tag-plan" title="O texto está pronto, mas o envio ainda não foi programado no servidor.">Planejada · falta programar</span>
                            : p.ligada ? <span className="tag-ar">No ar</span> : <span className="tag-off">Pausada</span>}
                        </div>
                        <div className="rg-meta">
                          <span className="rg-quando">{p.quando || "Sem horário"}</span>
                          <span>{p.gatilho || "Sem gatilho"}</span>
                        </div>
                      </div>
                      <div className="rg-dir">
                        {p.tipoMetrica ? <span className="rg-env">{envios[p.tipoMetrica] || 0} enviadas em 30 d</span> : null}
                        <button type="button" className="rg-acao" onClick={e => { e.stopPropagation(); setAberto(ab ? "" : p.id); }}>{ab ? "Fechar" : "Editar"}</button>
                        <button type="button" className="rg-acao rg-acao-x" onClick={e => { e.stopPropagation(); apagar(p); }}>Apagar</button>
                        {/* A chave só vale pra quem está no ar: pausa ou volta a enviar (depois de Salvar). */}
                        {!plan ? (
                          <label className="rg-chave-l" onClick={e => e.stopPropagation()} title={p.ligada ? "Desligue e salve pra pausar o envio" : "Ligue e salve pra voltar a enviar"}>
                            <span className="rg-chave-tx">{p.ligada ? "Enviando" : "Pausada"}</span>
                            <span className="rg-chave">
                              <input type="checkbox" checked={p.ligada} onChange={e => mudar(p.id, "ligada", e.target.checked)} />
                              <span />
                            </span>
                          </label>
                        ) : null}
                      </div>
                    </header>

                    {ab ? (
                      <div className="rg-corpo">
                        <div className="rg-edita">
                          {(
                            <div className="rg-campos">
                              <label>Nome<input value={p.nome} onChange={e => mudar(p.id, "nome", e.target.value)} /></label>
                              <label>Quando sai<input value={p.quando} placeholder="Ex.: D+1 às 10h" onChange={e => mudar(p.id, "quando", e.target.value)} /></label>
                              <label className="largo">O que dispara<input value={p.gatilho} placeholder="Ex.: entrou e não treinou em 24 h" onChange={e => mudar(p.id, "gatilho", e.target.value)} /></label>
                              <label>Fase<select value={p.fase} onChange={e => mudar(p.id, "fase", e.target.value)}>{fases.map(f => <option key={f}>{f}</option>)}</select></label>
                            </div>
                          )}
                          {!plan ? <p className="rg-dica rg-dica-ar">Nome, quando e gatilho aqui são só a descrição: o horário real de um passo no ar está programado no servidor.</p> : null}
                          <label className="rg-rot">Texto da mensagem</label>
                          <textarea ref={el => { refs.current[p.id] = el; }} value={p.texto} rows={Math.min(14, Math.max(4, p.texto.split("\n").length + 1))}
                            onChange={e => mudar(p.id, "texto", e.target.value)} />
                          <div className="rg-vars">
                            {(p.variaveis || []).length ? <span className="rg-vars-l">Inserir:</span> : null}
                            {(p.variaveis || []).map(v => <button key={v} type="button" onClick={() => inserir(p.id, v)}>{`{${v}}`}</button>)}
                            {plan ? <span className="rg-vars-l">Use {"{nome}"} e outras variáveis; elas são definidas quando o passo for programado.</span> : null}
                          </div>
                          <p className="rg-dica">Várias versões: separe com uma linha só com <code>---</code> (sorteia uma). {p.imagem ? `Vai junto: ${p.imagem}.` : ""}</p>
                        </div>
                        <div className="rg-prev">
                          <span className="rg-prev-l">Prévia no chat</span>
                          <div className="rg-chat">
                            <div className="rg-bot">Tá Pago!</div>
                            {p.imagem ? <div className="rg-img">{p.imagem}</div> : null}
                            <div className="rg-bolha">{previa(p.texto) || "…"}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
              <button type="button" className="rg-novo" onClick={() => novo(fase)}>+ Novo passo em {fase}</button>
            </div>
          </section>
        );
      })}

      <div className={`rg-barra ${sujo || estado ? "on" : ""}`}>
        <span>{estado === "salvando" ? "Salvando…" : estado === "ok" ? "Salvo. As mensagens no ar já usam o texto novo." : estado === "erro" ? "Não deu pra salvar. Tenta de novo." : "Alterações não salvas"}</span>
        <div>
          {sujo ? <button type="button" className="rg-desfazer" onClick={() => { setPassos(JSON.parse(salvo)); setEstado(""); }}>Desfazer</button> : null}
          <button type="button" className="rg-salvar" disabled={!sujo || estado === "salvando"} onClick={salvar}>Salvar</button>
        </div>
      </div>
    </>
  );
}
