"use client";

import { useMemo, useState } from "react";
import type { Conquista, Tema } from "@/lib/campanhas";

type Pessoa = { id: string; nome: string; tem: string[] };
type Dados = { conquistas: Conquista[]; temas: Tema[] };

const CARD_PADRAO = { fundo: "#C6F432", tinta: "#111111", apoio: "#3A4A10", barra: "rgba(17,17,17,.14)", barraOn: "#111111", botao: "#111111", botaoTexto: "#FFFFFF" };

async function subir(f: File): Promise<string> {
  const fd = new FormData();
  fd.append("imagem", f);
  const r = await fetch("/api/admin/campanhas", { method: "POST", body: fd });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || "Não deu pra enviar.");
  return j.caminho;
}

function Imagem({ valor, mudar, rotulo }: { valor?: string; mudar: (v: string) => void; rotulo: string }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <label className="cp-img">
      {rotulo}
      <span className="cp-img-l">
        {valor ? <img src={valor} alt="" /> : <span className="cp-img-v">sem imagem</span>}
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return;
          setOcupado(true);
          try { mudar(await subir(f)); } catch (err) { alert(err instanceof Error ? err.message : "Erro"); }
          setOcupado(false);
        }} />
        <span className="cp-img-b">{ocupado ? "Enviando…" : valor ? "Trocar" : "Enviar PNG"}</span>
        {valor ? <button type="button" className="cp-x" onClick={e => { e.preventDefault(); mudar(""); }}>Tirar</button> : null}
      </span>
    </label>
  );
}

/** Prévia do card da home e de um avatar com o enfeite, como o app desenha. */
function PreviaTema({ t }: { t: Tema }) {
  const c = { ...CARD_PADRAO, ...(t.card || {}) };
  const sem = ["S", "T", "Q", "Q", "S", "S", "D"];
  return (
    <div className="cp-prev">
      {t.faixa?.titulo ? (
        <div className="cp-faixa" style={{ borderColor: t.cor }}>
          {t.faixa.imagem ? <img src={t.faixa.imagem} alt="" /> : null}
          <div><b>{t.faixa.titulo}</b><span>{t.faixa.texto}</span></div>
        </div>
      ) : null}
      <div className="cp-card" style={{ background: c.fundo }}>
        {c.imagem ? <img className="cp-card-img" src={c.imagem} alt="" /> : null}
        <div className="cp-card-in">
          <span style={{ color: c.apoio }}>Ranking geral · na semana</span>
          <div className="cp-card-n" style={{ color: c.tinta }}>3<small style={{ color: c.tinta }}>º lugar</small></div>
          <div className="cp-sem">{sem.map((d, i) => <i key={i}><b style={{ background: i < 3 ? c.barraOn : c.barra }} /><em style={{ color: c.apoio }}>{d}</em></i>)}</div>
          <div className="cp-btn" style={{ background: c.botao, color: c.botaoTexto }}>Registrar treino</div>
        </div>
      </div>
      <div className="cp-avs">
        {["#B08968", "#7FA312", "#2EC4B6"].map((cor, i) => (
          <span key={i} className="cp-av" style={{ background: cor }}>
            {t.enfeite?.imagem ? <img src={t.enfeite.imagem} alt="" style={{ left: `${t.enfeite.x}%`, top: `${t.enfeite.y}%`, width: `${t.enfeite.w}%` }} /> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Editor({ inicial, ganharam, pessoas }: { inicial: Dados; ganharam: Record<string, number>; pessoas: Pessoa[] }) {
  const [d, setD] = useState<Dados>(inicial);
  const [salvo, setSalvo] = useState(JSON.stringify(inicial));
  const [estado, setEstado] = useState<"" | "salvando" | "ok" | "erro">("");
  const [aberto, setAberto] = useState("");
  const [teste, setTeste] = useState<{ uid: string; id: string; msg: string }>({ uid: "", id: "", msg: "" });
  const sujo = useMemo(() => JSON.stringify(d) !== salvo, [d, salvo]);

  const mudaC = (id: string, f: (c: Conquista) => Conquista) => { setEstado(""); setD(x => ({ ...x, conquistas: x.conquistas.map(c => (c.id === id ? f(c) : c)) })); };
  const mudaT = (id: string, f: (t: Tema) => Tema) => { setEstado(""); setD(x => ({ ...x, temas: x.temas.map(t => (t.id === id ? f(t) : t)) })); };

  const novaC = () => {
    const id = "conquista-" + Math.random().toString(36).slice(2, 6);
    setD(x => ({ ...x, conquistas: [...x.conquistas, { id, nome: "Nova conquista", descricao: "", imagem: "", cor: "#C6F432", regra: { tipo: "manual" }, ativa: false }] }));
    setAberto(id);
  };
  const novoT = () => {
    const id = "tema-" + Math.random().toString(36).slice(2, 6);
    const hoje = new Date().toISOString().slice(0, 10);
    setD(x => ({ ...x, temas: [...x.temas, { id, nome: "Novo tema", inicio: hoje, fim: hoje, ativo: false, cor: "#C6F432", card: { ...CARD_PADRAO } }] }));
    setAberto(id);
  };

  const salvar = async () => {
    setEstado("salvando");
    try {
      const r = await fetch("/api/admin/campanhas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "salvar", ...d }) });
      const j = await r.json();
      if (!j.ok) throw new Error();
      const novo = { conquistas: j.conquistas, temas: j.temas };
      setD(novo); setSalvo(JSON.stringify(novo)); setEstado("ok");
    } catch { setEstado("erro"); }
  };

  const dar = async (darOuTirar: boolean) => {
    if (!teste.uid || !teste.id) return;
    const r = await fetch("/api/admin/campanhas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ acao: "dar", uid: teste.uid, id: teste.id, dar: darOuTirar }) });
    const j = await r.json();
    setTeste(t => ({ ...t, msg: j.ok ? (darOuTirar ? "Dada. A comemoração aparece quando a pessoa abrir o app." : "Tirada.") : "Não deu." }));
  };

  const testador = (lista: string[] | undefined, uid: string, sim: boolean) => (sim ? [...new Set([...(lista || []), uid])] : (lista || []).filter(x => x !== uid));
  const nomeDe = (uid: string) => pessoas.find(p => p.id === uid)?.nome || uid;

  return (
    <>
      <section className="rg-fase">
        <div className="rg-fase-cab"><span className="rg-num">1</span><h2>Conquistas</h2></div>
        <div className="cp-grade">
          {d.conquistas.map(c => {
            const ab = aberto === c.id;
            return (
              <article key={c.id} className={`cp-c ${c.ativa ? "" : "off"} ${ab ? "ab" : ""}`}>
                <header onClick={() => setAberto(ab ? "" : c.id)}>
                  {c.imagem ? <img src={c.imagem} alt="" /> : <span className="cp-img-v">?</span>}
                  <div>
                    <b>{c.nome}</b>
                    <span>{c.regra.tipo === "todos" ? `Todo mundo${c.regra.ate ? ` até ${c.regra.ate}` : ""}` : c.regra.tipo === "treino" ? `Treinou ${c.regra.inicio === c.regra.fim ? `em ${c.regra.inicio}` : `de ${c.regra.inicio} a ${c.regra.fim}`}` : "Só manual"}</span>
                    <span>{ganharam[c.id] || 0} ganharam · {c.ativa ? "ativa" : "desligada"}</span>
                  </div>
                </header>
                {ab ? (
                  <div className="cp-corpo">
                    <div className="rg-campos">
                      <label>Nome<input value={c.nome} onChange={e => mudaC(c.id, x => ({ ...x, nome: e.target.value }))} /></label>
                      <label>Selo pequeno<input value={c.edicao || ""} placeholder="Edição limitada" onChange={e => mudaC(c.id, x => ({ ...x, edicao: e.target.value }))} /></label>
                      <label className="largo">O que a pessoa fez<input value={c.descricao} placeholder="Treinou no dia 31 de outubro." onChange={e => mudaC(c.id, x => ({ ...x, descricao: e.target.value }))} /></label>
                      <label>Regra<select value={c.regra.tipo} onChange={e => mudaC(c.id, x => ({ ...x, regra: e.target.value === "treino" ? { tipo: "treino", inicio: new Date().toISOString().slice(0, 10), fim: new Date().toISOString().slice(0, 10) } : e.target.value === "todos" ? { tipo: "todos" } : { tipo: "manual" } }))}>
                        <option value="treino">Treinou entre duas datas</option><option value="todos">Todo mundo (contas até uma data)</option><option value="manual">Só manual</option>
                      </select></label>
                      {c.regra.tipo === "treino" ? (<>
                        <label>De<input type="date" value={c.regra.inicio} onChange={e => mudaC(c.id, x => ({ ...x, regra: { ...(x.regra as { tipo: "treino"; inicio: string; fim: string }), inicio: e.target.value } }))} /></label>
                        <label>Até<input type="date" value={c.regra.fim} onChange={e => mudaC(c.id, x => ({ ...x, regra: { ...(x.regra as { tipo: "treino"; inicio: string; fim: string }), fim: e.target.value } }))} /></label>
                      </>) : c.regra.tipo === "todos" ? (
                        <label>Contas criadas até<input type="date" value={c.regra.ate || ""} onChange={e => mudaC(c.id, x => ({ ...x, regra: { tipo: "todos", ate: e.target.value } }))} /></label>
                      ) : null}
                      <label>Aparece bloqueada a partir de<input type="date" value={c.mostrarDe || ""} onChange={e => mudaC(c.id, x => ({ ...x, mostrarDe: e.target.value }))} /></label>
                      <label>Cor<input type="color" value={c.cor} onChange={e => mudaC(c.id, x => ({ ...x, cor: e.target.value }))} /></label>
                      <Imagem rotulo="Badge (PNG transparente, 540×620)" valor={c.imagem} mudar={v => mudaC(c.id, x => ({ ...x, imagem: v }))} />
                      <label className="cp-chk"><input type="checkbox" checked={c.ativa} onChange={e => mudaC(c.id, x => ({ ...x, ativa: e.target.checked }))} /> Ativa</label>
                      {c.regra.tipo === "treino" ? (
                        <label className="largo">Mensagem do dia no chat (9h, pra quem ainda não ganhou)
                          <textarea rows={3} value={c.mensagem || ""} placeholder="🏅 {nome}, hoje tem badge de edição limitada no Tá Pago!. Treine hoje e ganhe. Só vale hoje!" onChange={e => mudaC(c.id, x => ({ ...x, mensagem: e.target.value }))} />
                        </label>
                      ) : null}
                    </div>
                    <p className="rg-dica">Testadores ganham antes da regra (pra ver a comemoração): {(c.testadores || []).map(nomeDe).join(", ") || "ninguém"}.</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        <button type="button" className="rg-novo" onClick={novaC}>+ Nova conquista</button>

        <div className="cp-teste">
          <b>Testar numa conta</b>
          <select value={teste.uid} onChange={e => setTeste(t => ({ ...t, uid: e.target.value, msg: "" }))}><option value="">Pessoa…</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
          <select value={teste.id} onChange={e => setTeste(t => ({ ...t, id: e.target.value, msg: "" }))}><option value="">Conquista…</option>{d.conquistas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
          <button type="button" onClick={() => dar(true)}>Dar</button>
          <button type="button" onClick={() => dar(false)}>Tirar</button>
          <span>{teste.msg}</span>
        </div>
      </section>

      <section className="rg-fase">
        <div className="rg-fase-cab"><span className="rg-num">2</span><h2>Temas do dia</h2></div>
        <div className="cp-temas">
          {d.temas.map(t => {
            const ab = aberto === t.id;
            const c = { ...CARD_PADRAO, ...(t.card || {}) };
            const mc = (k: keyof typeof CARD_PADRAO | "imagem", v: string) => mudaT(t.id, x => ({ ...x, card: { ...CARD_PADRAO, ...(x.card || {}), [k]: v } }));
            return (
              <article key={t.id} className={`cp-t ${t.ativo ? "" : "off"}`}>
                <header onClick={() => setAberto(ab ? "" : t.id)}>
                  <b>{t.nome}</b><span>{t.inicio === t.fim ? t.inicio : `${t.inicio} → ${t.fim}`} · {t.ativo ? "ativo" : "desligado"}</span>
                </header>
                {ab ? (
                  <div className="cp-t-corpo">
                    <div className="rg-campos">
                      <label>Nome<input value={t.nome} onChange={e => mudaT(t.id, x => ({ ...x, nome: e.target.value }))} /></label>
                      <label>De<input type="date" value={t.inicio} onChange={e => mudaT(t.id, x => ({ ...x, inicio: e.target.value }))} /></label>
                      <label>Até<input type="date" value={t.fim} onChange={e => mudaT(t.id, x => ({ ...x, fim: e.target.value }))} /></label>
                      <label>Cor de destaque<input type="color" value={t.cor} onChange={e => mudaT(t.id, x => ({ ...x, cor: e.target.value }))} /></label>
                      <label className="cp-chk"><input type="checkbox" checked={t.ativo} onChange={e => mudaT(t.id, x => ({ ...x, ativo: e.target.checked }))} /> Ativo</label>

                      <h3 className="largo">Faixa no topo da home</h3>
                      <label>Título<input value={t.faixa?.titulo || ""} onChange={e => mudaT(t.id, x => ({ ...x, faixa: { texto: "", ...(x.faixa || {}), titulo: e.target.value } }))} /></label>
                      <label className="largo">Texto<input value={t.faixa?.texto || ""} onChange={e => mudaT(t.id, x => ({ ...x, faixa: { titulo: "", ...(x.faixa || {}), texto: e.target.value } }))} /></label>
                      <label>Abre a conquista<select value={t.faixa?.conquista || ""} onChange={e => mudaT(t.id, x => ({ ...x, faixa: { titulo: "", texto: "", ...(x.faixa || {}), conquista: e.target.value } }))}><option value="">Nenhuma</option>{d.conquistas.map(q => <option key={q.id} value={q.id}>{q.nome}</option>)}</select></label>
                      <Imagem rotulo="Imagem da faixa" valor={t.faixa?.imagem} mudar={v => mudaT(t.id, x => ({ ...x, faixa: { titulo: "", texto: "", ...(x.faixa || {}), imagem: v } }))} />

                      <h3 className="largo">Card da home</h3>
                      <label>Fundo (cor ou gradiente)<input value={c.fundo} onChange={e => mc("fundo", e.target.value)} /></label>
                      <label>Texto<input type="color" value={c.tinta} onChange={e => mc("tinta", e.target.value)} /></label>
                      <label>Texto de apoio<input type="color" value={c.apoio} onChange={e => mc("apoio", e.target.value)} /></label>
                      <label>Barra cheia<input type="color" value={c.barraOn} onChange={e => mc("barraOn", e.target.value)} /></label>
                      <label>Barra vazia<input value={c.barra} onChange={e => mc("barra", e.target.value)} /></label>
                      <label>Botão<input type="color" value={c.botao} onChange={e => mc("botao", e.target.value)} /></label>
                      <label>Texto do botão<input type="color" value={c.botaoTexto} onChange={e => mc("botaoTexto", e.target.value)} /></label>
                      <Imagem rotulo="Ilustração (canto direito)" valor={c.imagem} mudar={v => mc("imagem", v)} />

                      <h3 className="largo">Enfeite nos avatares</h3>
                      <Imagem rotulo="Enfeite (PNG transparente)" valor={t.enfeite?.imagem} mudar={v => mudaT(t.id, x => ({ ...x, enfeite: v ? { x: -4, y: -60, w: 100, ...(x.enfeite || {}), imagem: v } : undefined }))} />
                      {t.enfeite ? (<>
                        <label>Posição X (%)<input type="number" value={t.enfeite.x} onChange={e => mudaT(t.id, x => ({ ...x, enfeite: { ...x.enfeite!, x: Number(e.target.value) } }))} /></label>
                        <label>Posição Y (%)<input type="number" value={t.enfeite.y} onChange={e => mudaT(t.id, x => ({ ...x, enfeite: { ...x.enfeite!, y: Number(e.target.value) } }))} /></label>
                        <label>Tamanho (%)<input type="number" value={t.enfeite.w} onChange={e => mudaT(t.id, x => ({ ...x, enfeite: { ...x.enfeite!, w: Number(e.target.value) } }))} /></label>
                      </>) : null}
                      <label className="largo">Testadores (veem antes da data)
                        <select value="" onChange={e => e.target.value && mudaT(t.id, x => ({ ...x, testadores: testador(x.testadores, e.target.value, true) }))}><option value="">Adicionar pessoa…</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                      </label>
                      <div className="largo cp-tags">{(t.testadores || []).map(u => <button type="button" key={u} onClick={() => mudaT(t.id, x => ({ ...x, testadores: testador(x.testadores, u, false) }))}>{nomeDe(u)} ✕</button>)}</div>
                    </div>
                    <PreviaTema t={t} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
        <button type="button" className="rg-novo" onClick={novoT}>+ Novo tema</button>
      </section>

      <div className={`rg-barra ${sujo || estado ? "on" : ""}`}>
        <span>{estado === "salvando" ? "Salvando…" : estado === "ok" ? "Salvo. Já vale no app." : estado === "erro" ? "Não deu pra salvar. Tenta de novo." : sujo ? "Alterações não salvas" : ""}</span>
        <button type="button" className="rg-salvar" disabled={!sujo || estado === "salvando"} onClick={salvar}>Salvar</button>
      </div>
    </>
  );
}
