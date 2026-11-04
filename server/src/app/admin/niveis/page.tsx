import { cookies } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import { lerBanco, type Treino } from "@/lib/store";
import { pontosDoDia } from "@/lib/ranking";
import { diaSP } from "@/lib/tipos";
import { FAIXAS, INSIGNIAS, PERFIS, RECOMPENSAS, TEMPORADA, faixaDe, nivelDe, xpDoNivel, type TipoRecompensa } from "@/lib/niveis";
import "../admin.css";
import "./niveis.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tá Pago! · Níveis", robots: { index: false, follow: false } };

const n = (v: number) => Math.round(v).toLocaleString("pt-BR");
const TIPO: Record<TipoRecompensa, string> = { app: "No app", cupom: "Cupom", loja: "Loja", brinde: "Brinde físico" };

/** Semanas → texto ("5 dias", "3,2 meses", "1,7 ano"). */
function tempo(semanas: number) {
  if (!isFinite(semanas)) return "—";
  if (semanas < 1.2) return `${Math.max(1, Math.round(semanas * 7))} ${Math.round(semanas * 7) === 1 ? "dia" : "dias"}`;
  if (semanas < 8.7) return `${Math.round(semanas)} semanas`;
  if (semanas < 52) return `${(semanas / 4.33).toFixed(1).replace(".", ",")} meses`;
  const a = semanas / 52;
  return `${a.toFixed(1).replace(".", ",")} ${a < 2 ? "ano" : "anos"}`;
}

export default async function Niveis() {
  if (!cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value)) redirect("/admin");
  const b = await lerBanco();
  const hoje = diaSP();
  const ts = b.treinos.filter(t => !t.pendenteFoto);
  const d14 = new Date(Date.now() - 13 * 86400000).toISOString().slice(0, 10);

  // XP real de cada pessoa = soma dos pontos de cada dia (o mesmo número do ranking geral).
  const pessoas = Object.values(b.usuarios).map(u => {
    const porDia = new Map<string, Treino[]>();
    ts.filter(t => t.uid === u.id).forEach(t => porDia.set(t.dia, [...(porDia.get(t.dia) || []), t]));
    let xp = 0, xp14 = 0;
    porDia.forEach((l, d) => { const p = pontosDoDia(l); xp += p; if (d >= d14) xp14 += p; });
    const diasNoApp = Math.max(1, Math.round((Date.now() - Date.parse(u.criadoEm)) / 86400000) + 1);
    const ritmo = xp14 / (Math.min(14, diasNoApp) / 7); // XP por semana no ritmo recente
    return { id: u.id, nome: u.nome, ritmo, ...nivelDe(xp) };
  }).sort((a, c) => c.xp - a.xp);

  const comXp = pessoas.filter(p => p.xp > 0);
  const porFaixa = FAIXAS.map(f => ({ f, n: pessoas.filter(p => p.faixa.id === f.id).length }));
  const maxNivel = Math.max(10, ...pessoas.map(p => p.nivel));
  const porNivel = Array.from({ length: maxNivel }, (_, i) => ({ nivel: i + 1, n: pessoas.filter(p => p.nivel === i + 1).length }));

  // Projeção de quem chega em cada recompensa com custo (cupom/brinde), se o ritmo das últimas 2 semanas continuar.
  const chega = (nivel: number, semanas: number) => pessoas.filter(p => p.nivel >= nivel || (p.ritmo > 0 && (xpDoNivel(nivel) - p.xp) / p.ritmo <= semanas)).length;
  const custo = RECOMPENSAS.filter(r => r.tipo === "cupom" || r.tipo === "brinde" || r.tipo === "loja").map(r => ({ ...r, ja: pessoas.filter(p => p.nivel >= r.nivel).length, m3: chega(r.nivel, 13), m6: chega(r.nivel, 26), m12: chega(r.nivel, 52) }));

  // Curva (níveis 1 a 60) pro gráfico.
  const curva = Array.from({ length: 60 }, (_, i) => ({ nivel: i + 1, xp: xpDoNivel(i + 1) }));
  const marcos = [2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 100];

  return (
    <main className="adm nv">
      <header className="topo">
        <div className="marca">TÁ PAGO! <span>admin</span></div>
        <nav className="secoes">
          <a href="/admin">Números</a>
          <a className="on" href="/admin/niveis">Níveis</a>
          <a href="/admin/regua">Régua</a>
          <a href="/admin/campanhas">Campanhas</a>
          <a href="/admin/avisos">Avisos</a>
          <a href="/admin/tecnico">Como funciona</a>
        </nav>
      </header>

      <section>
        <span className="nv-proposta">Proposta · ainda não aparece no app</span>
        <h1>Níveis do Tá Pago!</h1>
        <p className="lead">Uma jornada de anos, como no Zwift: cada treino vira XP, o XP sobe o nível, e cada faixa destrava algo que não se compra, só se conquista. O começo é rápido pra pegar o hábito; o topo leva anos pra virar objeto de desejo.</p>
        <div className="nv-regras">
          <div className="card"><h3>XP = Pontos Tá Pago!</h3><p>Os mesmos pontos de hoje: 10 por dia treinado, 1 a cada 5 min e 1 por km. No máximo 54 por dia.</p></div>
          <div className="card"><h3>Nível nunca cai</h3><p>O ranking da semana zera; o nível é a história da pessoa. Parar não tira nada, só pausa.</p></div>
          <div className="card"><h3>Só treino validado</h3><p>A IA da foto e o teto diário protegem os níveis: não dá pra comprar nem farmar.</p></div>
          <div className="card"><h3>Começo sem atropelo, topo raro</h3><p>Quem treina pesado a semana toda fecha a 1ª semana no nível 3. O Forte (10) leva uns 2 meses e o nível 60 uns 5 anos, treinando 4x por semana.</p></div>
        </div>
      </section>

      <section>
        <h2>As faixas</h2>
        <div className="nv-faixas">
          {FAIXAS.map(f => (
            <div key={f.id} className="nv-faixa" style={{ background: f.cor, color: f.tinta }}>
              <span className="nv-faixa-n">Níveis {f.de}–{f.ate === 100 ? "100" : f.ate}</span>
              <strong>{f.nome}</strong>
              <p>{f.frase}</p>
              <span className="nv-faixa-t">{n(xpDoNivel(f.de))} XP · regular: {f.de === 1 ? "no 1º dia" : tempo(xpDoNivel(f.de) / PERFIS[1].xpSemana)}</span>
              <span className="nv-faixa-q">{porFaixa.find(x => x.f.id === f.id)?.n || 0} pessoas hoje</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>A curva</h2>
        <div className="grade2">
          <div className="card">
            <div className="card-cab"><div><h3>XP total pra chegar em cada nível</h3><p className="sub">níveis 1 a 60 · a cor é a faixa</p></div><span className="max">nível 60 = {n(xpDoNivel(60))} XP</span></div>
            <svg viewBox="0 0 640 220" className="barras" role="img" aria-label="Curva de XP por nível">
              <line x1="0" x2="640" y1="200" y2="200" className="base" />
              {curva.map((c, i) => {
                const w = 640 / curva.length, h = Math.max(2, (c.xp / xpDoNivel(60)) * 190), f = faixaDe(c.nivel);
                return (
                  <g key={c.nivel} data-tip={`Nível ${c.nivel} · ${n(c.xp)} XP · ${f.nome}`}>
                    <rect x={i * w} y={0} width={w} height={200} fill="transparent" />
                    <rect x={i * w + 1} y={200 - h} width={w - 2} height={h} rx={Math.min(3, (w - 2) / 2)} fill={f.barra} />
                    {[1, 10, 20, 30, 40, 50, 60].includes(c.nivel) ? <text x={i * w + w / 2} y={216} className="eixo">{c.nivel}</text> : null}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="card">
            <h3>Quanto tempo leva</h3>
            <p className="sub">se a pessoa mantiver o ritmo</p>
            <div className="rolar">
              <table className="tab nv-tempo">
                <thead><tr><th>Nível</th><th>XP</th>{PERFIS.map(p => <th key={p.nome}>{p.nome}<span>{p.detalhe}</span></th>)}</tr></thead>
                <tbody>
                  {marcos.map(m => (
                    <tr key={m}><td><span className="nv-pill" style={{ background: faixaDe(m).cor, color: faixaDe(m).tinta }}>{m}</span></td><td>{n(xpDoNivel(m))}</td>
                      {PERFIS.map(p => <td key={p.nome}>{tempo(xpDoNivel(m) / p.xpSemana)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2>O que cada nível destrava</h2>
        <p className="nota">No app = custo zero e escala. Cupom = parceiro. Loja = item que só pode ser comprado a partir do nível (o "ninguém tem a camiseta"). Brinde físico = enviado pelo time.</p>
        <div className="nv-recs">
          {RECOMPENSAS.map((r, i) => {
            const f = faixaDe(r.nivel);
            return (
              <div key={i} className="nv-rec">
                <span className="nv-pill" style={{ background: f.cor, color: f.tinta }}>{r.nivel}</span>
                <div className="nv-rec-tx"><strong>{r.nome}</strong><span>{r.detalhe}</span></div>
                <span className={"nv-tipo " + r.tipo}>{TIPO[r.tipo]}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2>Hoje, com os dados reais</h2>
        <p className="nota">Se os níveis já existissem: o XP de cada pessoa é a soma dos pontos que ela já fez. Ritmo = XP por semana nas últimas 2 semanas.</p>
        <div className="kpis">
          <div className="kpi"><span className="kpi-t">Pessoas com XP</span><span className="kpi-v">{comXp.length}</span><span className="kpi-s">de {pessoas.length}</span></div>
          <div className="kpi"><span className="kpi-t">Maior nível</span><span className="kpi-v">{pessoas[0]?.nivel || 1}</span><span className="kpi-s">{pessoas[0]?.nome || "—"} · {n(pessoas[0]?.xp || 0)} XP</span></div>
          <div className="kpi"><span className="kpi-t">Nível médio (quem treinou)</span><span className="kpi-v">{comXp.length ? (comXp.reduce((a, p) => a + p.nivel, 0) / comXp.length).toFixed(1).replace(".", ",") : "—"}</span></div>
          <div className="kpi"><span className="kpi-t">Ritmo médio</span><span className="kpi-v">{comXp.length ? n(comXp.reduce((a, p) => a + p.ritmo, 0) / comXp.length) : 0}</span><span className="kpi-s">XP por semana</span></div>
        </div>
        <div className="grade2">
          <div className="card">
            <div className="card-cab"><div><h3>Pessoas por nível</h3><p className="sub">hoje</p></div></div>
            <svg viewBox="0 0 640 200" className="barras" role="img" aria-label="Pessoas por nível">
              <line x1="0" x2="640" y1="180" y2="180" className="base" />
              {porNivel.map((c, i) => {
                const max = Math.max(1, ...porNivel.map(x => x.n)), w = 640 / porNivel.length, h = c.n ? Math.max(3, (c.n / max) * 168) : 0, f = faixaDe(c.nivel);
                return (
                  <g key={c.nivel} data-tip={`Nível ${c.nivel} · ${c.n} ${c.n === 1 ? "pessoa" : "pessoas"}`}>
                    <rect x={i * w} y={0} width={w} height={180} fill="transparent" />
                    {h ? <rect x={i * w + 2} y={180 - h} width={w - 4} height={h} rx={Math.min(4, (w - 4) / 2)} fill={f.barra} /> : null}
                    {(porNivel.length <= 20 || c.nivel % 5 === 0 || c.nivel === 1) ? <text x={i * w + w / 2} y={196} className="eixo">{c.nivel}</text> : null}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="card">
            <h3>Planejar brindes e cupons</h3>
            <p className="sub">quantas pessoas chegam em cada marco, no ritmo atual</p>
            <div className="rolar">
              <table className="tab">
                <thead><tr><th>Nível</th><th>O quê</th><th>Já têm</th><th>3 meses</th><th>6 meses</th><th>12 meses</th></tr></thead>
                <tbody>
                  {custo.map((r, i) => (
                    <tr key={i}><td><span className="nv-pill" style={{ background: faixaDe(r.nivel).cor, color: faixaDe(r.nivel).tinta }}>{r.nivel}</span></td><td>{r.nome}<span className={"nv-tipo mini " + r.tipo}>{TIPO[r.tipo]}</span></td><td>{r.ja}</td><td>{r.m3}</td><td>{r.m6}</td><td>{r.m12}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="card rolar">
          <table className="tab">
            <thead><tr><th>Pessoa</th><th>XP</th><th>Nível</th><th>Faixa</th><th>Progresso</th><th>Ritmo / semana</th><th>Próximo nível em</th><th>Nível 10 em</th><th>Nível 30 em</th></tr></thead>
            <tbody>
              {comXp.map(p => (
                <tr key={p.id}>
                  <td>{p.nome}</td><td>{n(p.xp)}</td>
                  <td><span className="nv-pill" style={{ background: p.faixa.cor, color: p.faixa.tinta }}>{p.nivel}</span></td>
                  <td>{p.faixa.nome}</td>
                  <td><span className="nv-barra"><i style={{ width: Math.round(p.pct * 100) + "%" }} /></span><span className="nv-falta">faltam {n(p.falta)}</span></td>
                  <td>{n(p.ritmo)}</td>
                  <td>{p.ritmo > 0 ? tempo(p.falta / p.ritmo) : "parado"}</td>
                  <td>{p.nivel >= 10 ? "já é" : p.ritmo > 0 ? tempo((xpDoNivel(10) - p.xp) / p.ritmo) : "—"}</td>
                  <td>{p.nivel >= 30 ? "já é" : p.ritmo > 0 ? tempo((xpDoNivel(30) - p.xp) / p.ritmo) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Outras camadas</h2>
        <div className="grade2">
          <div className="card">
            <h3>Insígnias</h3>
            <p className="sub">conquistas pontuais, estilo Strava · só visuais, não dão XP</p>
            <div className="lista">{INSIGNIAS.map(i => <div key={i.nome} className="lista-l nv-ins"><span className="lista-k">{i.nome}</span><span className="nv-ins-r">{i.regra}</span></div>)}</div>
          </div>
          <div className="card">
            <h3>Temporadas</h3>
            <p className="sub">estilo battle pass · o nível não zera, a temporada sim</p>
            <dl className="nv-temp">
              <dt>Duração</dt><dd>{TEMPORADA.duracao}</dd>
              <dt>Meta</dt><dd>{TEMPORADA.meta}</dd>
              <dt>Prêmio</dt><dd>{TEMPORADA.premio}</dd>
            </dl>
            <h3 className="mt">No app (quando aplicar)</h3>
            <ul className="nv-app">
              <li>Selo do nível ao lado do nome no ranking, na timeline e no perfil.</li>
              <li>Barra de XP na home, logo abaixo da posição.</li>
              <li>Comemoração de &quot;subiu de nível&quot; (como a de campeão), com arte pra postar.</li>
              <li>Página &quot;Minha jornada&quot;: faixas, próximos destraves e insígnias.</li>
              <li>Mensagem no chat quando muda de faixa (passo novo na régua).</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2>Pra decidir antes de aplicar</h2>
        <ol className="nv-decidir">
          <li>XP é igual aos Pontos Tá Pago! (proposta) ou ganha bônus (sequência, semana cheia)? Bônus acelera, mas infla o topo.</li>
          <li>Os nomes das faixas: Animado, Forte, Sinistro, Casca grossa, Monstro, Lenda, Tá Pago Black.</li>
          <li>Quem paga os brindes e cupons, e o teto por mês (a tabela acima ajuda a prever).</li>
          <li>A Loja: abre no nível 30 com a camiseta? Venda pelo próprio PhizChat (pagamento) ou link externo?</li>
          <li>Quem já treinou começa com o XP de tudo que já fez (proposta) ou do zero?</li>
        </ol>
      </section>

      <div id="dica" className="dica" role="tooltip" />
      <script dangerouslySetInnerHTML={{ __html: `(function(){var d=document.getElementById("dica");document.addEventListener("pointermove",function(e){var g=e.target.closest&&e.target.closest("[data-tip]");if(!g){d.style.opacity=0;return;}d.textContent=g.getAttribute("data-tip");d.style.opacity=1;var x=Math.min(e.clientX+14,window.innerWidth-d.offsetWidth-8);d.style.transform="translate("+x+"px,"+(e.clientY+14)+"px)";});})();` }} />
    </main>
  );
}
