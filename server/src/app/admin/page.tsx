import { cookies } from "next/headers";
import type { Metadata } from "next";
import { lerBanco } from "@/lib/store";
import { lerMetricas } from "@/lib/metricas";
import { calcularPainel, type Painel } from "@/lib/admin";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tá Pago! · Admin", robots: { index: false, follow: false } };

const n = (v: number) => v.toLocaleString("pt-BR");
const dm = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
const dataHora = (iso: string) => iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
const desde = (iso: string) => {
  if (!iso) return "—";
  const m = (Date.now() - Date.parse(iso)) / 60000;
  if (m < 60) return `há ${Math.max(1, Math.round(m))} min`;
  if (m < 1440) return `há ${Math.round(m / 60)} h`;
  return `há ${Math.round(m / 1440)} d`;
};

export default async function Admin({ searchParams }: { searchParams: Promise<{ erro?: string; dias?: string }> }) {
  const q = await searchParams;
  const ok = cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value);
  if (!ok) return <Entrar erro={q.erro || ""} />;
  const janela = q.dias === "90" ? 90 : q.dias === "7" ? 7 : 30;
  const [b, m] = await Promise.all([lerBanco(), lerMetricas()]);
  const p = calcularPainel(b, m, janela);
  return <Dashboard p={p} />;
}

function Entrar({ erro }: { erro: string }) {
  return (
    <main className="adm adm-login">
      <form method="post" action="/api/admin/entrar" className="login">
        <div className="marca">TÁ PAGO! <span>admin</span></div>
        <label htmlFor="senha">Senha do time</label>
        <input id="senha" name="senha" type="password" autoFocus autoComplete="current-password" />
        {erro ? <p className="erro">{erro === "2" ? "Muitas tentativas. Espere 15 minutos." : "Senha errada."}</p> : null}
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}

const SECOES = [["geral", "Visão geral"], ["crescimento", "Crescimento"], ["treinos", "Treinos"], ["strava", "Strava"], ["social", "Social"], ["chat", "Chat"], ["grupos", "Grupos"], ["pessoas", "Pessoas"]];

function Dashboard({ p }: { p: Painel }) {
  const g = p.geral;
  return (
    <main className="adm">
      <header className="topo">
        <div className="marca">TÁ PAGO! <span>admin</span></div>
        <nav className="secoes">{SECOES.map(([id, t]) => <a key={id} href={"#" + id}>{t}</a>)}<a className="tec-link" href="/admin/niveis">Níveis</a><a className="tec-link" href="/admin/regua">Régua</a>
          <a href="/admin/campanhas">Campanhas</a><a className="tec-link" href="/admin/avisos">Avisos</a><a className="tec-link" href="/admin/tecnico">Como funciona</a></nav>
        <div className="janela">
          {[7, 30, 90].map(d => <a key={d} className={p.janela === d ? "on" : ""} href={"/admin?dias=" + d}>{d} dias</a>)}
        </div>
      </header>

      <p className="nota">Atualizado agora · {dataHora(new Date().toISOString())}. Sessões, aberturas depois de mensagem, IA e tentativas de Strava são medidas desde {p.inicioMetricas ? dataHora(p.inicioMetricas) : "agora (ainda sem dados)"}.</p>

      <section id="geral">
        <h2>Visão geral</h2>
        <div className="kpis">
          <Kpi t="Pessoas" v={g.pessoas} s={`+${g.novas7} em 7 dias · +${g.novasHoje} hoje`} />
          <Kpi t="Ativas hoje" v={g.dau} s={`${g.wau} em 7 dias · ${g.mau} em 30 dias`} />
          <Kpi t="Já treinaram" v={g.treinaram} s={`${g.ativacao}% de quem entrou`} />
          <Kpi t="Treinos" v={g.treinos} s={`${g.treinosHoje} hoje · ${g.treinos7} em 7 dias`} />
          <Kpi t="Com foto · Strava" v={`${n(g.manuais)} · ${n(g.viaStrava)}`} s={`${g.treinosPorPessoa} treinos por pessoa`} />
          <Kpi t="Strava conectado" v={g.stravaConectados} s={`${p.strava.pctPessoas}% das pessoas`} />
          <Kpi t="Minutos · km" v={`${n(g.minutos)} · ${n(g.km)}`} s="somando todos os treinos" />
          <Kpi t="Sessões no app" v={g.sessoes} s={`${g.sessoes7} em 7 dias`} />
        </div>
      </section>

      <section id="crescimento">
        <h2>Crescimento</h2>
        <div className="grade2">
          <Barras t="Pessoas ativas por dia" s="abriu o app, treinou ou entrou" dados={p.porDia.map(d => ({ x: d.dia, v: d.ativos }))} un="pessoas" />
          <Barras t="Pessoas novas por dia" dados={p.porDia.map(d => ({ x: d.dia, v: d.novas }))} un="novas" />
          <Barras t="Total de pessoas" s="acumulado" dados={p.acumulado.map(d => ({ x: d.dia, v: d.total }))} un="pessoas" />
          <Barras t="Sessões por dia" s="aberturas do miniapp" dados={p.porDia.map(d => ({ x: d.dia, v: d.sessoes }))} un="sessões" />
        </div>
        <div className="grade2">
          <div className="card">
            <h3>Funil</h3>
            <p className="sub">de todo mundo que já entrou</p>
            <div className="funil">
              {p.funil.map(f => (
                <div key={f.etapa} className="funil-l">
                  <span className="funil-t">{f.etapa}</span>
                  <span className="funil-b"><i style={{ width: f.pct + "%" }} /></span>
                  <span className="funil-v">{n(f.n)} <em>{f.pct}%</em></span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Retenção por semana de entrada</h3>
            <p className="sub">% da turma ativa em cada semana depois de entrar</p>
            <table className="ret">
              <thead><tr><th>Entrou na semana de</th><th>Pessoas</th>{[0, 1, 2, 3, 4].map(k => <th key={k}>S{k}</th>)}</tr></thead>
              <tbody>
                {p.retencao.map(r => (
                  <tr key={r.semana}>
                    <td>{dm(r.semana)}</td><td>{r.pessoas}</td>
                    {r.cel.map((c, i) => <td key={i} className="ret-c" style={c === null ? undefined : { background: `rgba(198,244,50,${0.15 + (c / 100) * 0.85})` }}>{c === null ? "" : c + "%"}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="treinos">
        <h2>Treinos</h2>
        <div className="grade2">
          <Barras t="Treinos por dia" dados={p.porDia.map(d => ({ x: d.dia, v: d.treinos, extra: `${d.manuais} com foto · ${d.strava} Strava` }))} un="treinos" />
          <Lista t="Por tipo" itens={p.treinos.porTipo.map(t => ({ k: t.k, v: t.n }))} />
          <Barras t="Hora do treino" s="horário de Brasília" dados={p.treinos.porHora.map(h => ({ x: h.h + "h", v: h.n }))} un="treinos" rotulos="todos" />
          <Barras t="Dia da semana" dados={p.treinos.porSemana.map(d => ({ x: d.d, v: d.n }))} un="treinos" rotulos="todos" />
        </div>
        <div className="kpis">
          <Kpi t="Duração média" v={p.treinos.minMedio + " min"} />
          <Kpi t="Fotos conferidas pela IA" v={p.treinos.ia.conferidas} s={`${p.treinos.ia.ok} ok · ${p.treinos.ia.duvida} dúvida · ${p.treinos.ia.recusadas} recusadas`} />
          <Kpi t="Custo da IA" v={"US$ " + p.treinos.ia.custoUsd.toFixed(2)} s="≈ US$ 0,0115 por foto" />
          <Kpi t="Esperando foto" v={p.treinos.pendentesFoto} s="lançados à mão no Strava" />
          <Kpi t="Na timeline geral · só grupos" v={`${p.treinos.visibilidade.geral} · ${p.treinos.visibilidade.soGrupos}`} s="quem pode ver" />
        </div>
      </section>

      <section id="strava">
        <h2>Strava</h2>
        <div className="kpis">
          <Kpi t="Conectados" v={p.strava.conectados} s={`${p.strava.pctPessoas}% das pessoas`} />
          <Kpi t="Tentaram conectar" v={p.strava.pessoasTentaram} s={`${p.strava.tentativas} toques · ${p.strava.pelaPagina} pelo navegador`} />
          <Kpi t="Conseguiram" v={p.strava.conectaramDepoisDeTentar} s={`de ${p.strava.pessoasTentaram} que tentaram`} />
          <Kpi t="Desconectaram" v={p.strava.desconectaram} />
          <Kpi t="Treinos do Strava" v={p.strava.treinos} s={`${p.strava.pctTreinos}% dos treinos · ${p.strava.treinos7} em 7 dias`} />
          <Kpi t="Ganharam foto no app" v={p.strava.comFotoNoApp} s={`${p.strava.lancadosAMao} esperando foto`} />
        </div>
      </section>

      <section id="social">
        <h2>Social</h2>
        <div className="kpis">
          <Kpi t="Tá pagos dados" v={p.social.tapagos} s={`${p.social.tapagos7} em 7 dias · ${p.social.pessoasDeram} pessoas deram`} />
          <Kpi t="Cutucadas" v={p.social.cutucadas} s={`${p.social.cutucadasChat} foram pro chat · ${p.social.cutucadosTreinaram} viraram treino no dia`} />
          <Kpi t="Grupos" v={p.grupos.length} s={`${p.grupos.reduce((a, x) => a + x.membros, 0)} vagas ocupadas`} />
          <Kpi t="Convites pelo app" v={p.social.convites} s={`${p.social.convitesAceitos} aceitos`} />
          <Kpi t="Campeões da semana" v={p.social.vitorias} />
          <Kpi t="Privacidade" v={`${p.social.perfisFechados} · ${p.social.foraDoGeral}`} s="perfil fechado · fora do ranking geral" />
        </div>
      </section>

      <section id="chat">
        <h2>Chat · mensagens do bot</h2>
        <p className="nota">O PhizChat ainda não manda "entregue/lida" pro nosso webhook ({p.chat.statusBotRecebidos} avisos recebidos). Por isso "abriu" = abriu o miniapp depois da mensagem, e "treinou" = registrou treino em até 24 h.</p>
        <div className="kpis">
          <Kpi t="Mensagens enviadas" v={p.chat.total.enviadas} s={`${p.chat.total.falharam} falharam · ${p.chat.total.pessoas} pessoas`} />
          <Kpi t="Podem receber" v={p.chat.alcancaveis} s={`${p.chat.comTelefone} com telefone · ${p.chat.desligaram} desligaram`} />
          <Kpi t="Abriram o app em 2 h" v={pctTxt(p.chat.medidos.abriram2h, p.chat.medidos.enviadas)} s={`${p.chat.medidos.abriram2h} de ${p.chat.medidos.enviadas} medidas`} />
          <Kpi t="Abriram em 24 h" v={pctTxt(p.chat.medidos.abriram24h, p.chat.medidos.enviadas)} s={`${p.chat.medidos.abriram24h} de ${p.chat.medidos.enviadas}`} />
          <Kpi t="Treinaram em 24 h" v={pctTxt(p.chat.medidos.treinaram24h, p.chat.medidos.enviadas)} s={`${p.chat.medidos.treinaram24h} de ${p.chat.medidos.enviadas}`} />
          <Kpi t="Lidas (status do bot)" v={p.chat.medidos.lidas} s={`${p.chat.medidos.entregues} entregues`} />
        </div>
        <div className="grade2">
          <Barras t="Mensagens por dia" dados={p.porDia.map(d => ({ x: d.dia, v: d.mensagens }))} un="mensagens" />
          <div className="card">
            <h3>Status no envio</h3>
            <p className="sub">o que a API do bot respondeu</p>
            <Lista itens={p.chat.status.map(s => ({ k: s.k, v: s.n }))} solta />
            {p.chat.erros.length ? <><h3 className="mt">Erros</h3><Lista itens={p.chat.erros.map(e => ({ k: e.k, v: e.n }))} solta /></> : null}
          </div>
        </div>
        <div className="card">
          <h3>Por tipo de mensagem</h3>
          <div className="rolar">
            <table className="tab">
              <thead><tr><th>Mensagem</th><th>Enviadas</th><th>Falharam</th><th>Pessoas</th><th>Abriram 2 h</th><th>Abriram 24 h</th><th>Treinaram 24 h</th></tr></thead>
              <tbody>
                {p.chat.porTipo.map(t => (
                  <tr key={t.tipo}><td>{t.nome}</td><td>{t.enviadasTotal}</td><td>{t.falharam}</td><td>{t.pessoas}</td>
                    <td>{pctTxt(t.abriram2h, t.enviadas)}</td><td>{pctTxt(t.abriram24h, t.enviadas)}</td><td>{pctTxt(t.treinaram24h, t.enviadas)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h3>Últimas mensagens</h3>
          <div className="rolar">
            <table className="tab">
              <thead><tr><th>Quando</th><th>Pra quem</th><th>Mensagem</th><th>Status</th><th>Abriu</th><th>Treinou</th></tr></thead>
              <tbody>
                {p.chat.ultimas.map((e, i) => (
                  <tr key={i}><td>{dataHora(e.em)}</td><td>{e.nome}</td><td>{e.tipo}</td><td>{e.status}{e.erro ? <span className="erro-p"> · {e.erro}</span> : null}</td><td>{e.abriu ? "sim" : "—"}</td><td>{e.treinou ? "sim" : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="grupos">
        <h2>Grupos</h2>
        <div className="card rolar">
          <table className="tab">
            <thead><tr><th>Grupo</th><th>Membros</th><th>Conta</th><th>Treinos</th><th>Treinos 7 d</th><th>Ativos 7 d</th><th>Desafio</th><th>Dono</th><th>Criado</th></tr></thead>
            <tbody>
              {p.grupos.map(x => (
                <tr key={x.nome + x.criadoEm}><td>{x.nome}</td><td>{x.membros}</td><td>{x.metrica}</td><td>{x.treinos}</td><td>{x.treinos7}</td><td>{x.ativos7}</td><td>{x.desafio || "—"}</td><td>{x.dono}</td><td>{dataHora(x.criadoEm)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="pessoas">
        <h2>Pessoas <span className="cont">{p.pessoas.length}</span></h2>
        <div className="card rolar">
          <table className="tab">
            <thead><tr><th>Nome</th><th>Entrou</th><th>Último acesso</th><th>Sessões</th><th>Treinos</th><th>Pontos</th><th>Strava</th><th>Grupos</th><th>Tá pagos</th><th>Avisos</th><th>Perfil</th></tr></thead>
            <tbody>
              {p.pessoas.map(x => (
                <tr key={x.id}><td>{x.nome}</td><td>{dataHora(x.entrou)}</td><td>{desde(x.ultimo)}</td><td>{x.sessoes}</td><td>{x.treinos}</td><td>{x.pontos}</td>
                  <td>{x.strava ? "sim" : "—"}</td><td>{x.grupos}</td><td>{x.tapagos}</td><td>{x.avisos ? "sim" : "—"}</td><td>{x.publico ? (x.geral ? "público" : "fora do geral") : "fechado"}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div id="dica" className="dica" role="tooltip" />
      <script dangerouslySetInnerHTML={{ __html: DICA }} />
    </main>
  );
}

const pctTxt = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "—");

function Kpi({ t, v, s }: { t: string; v: number | string; s?: string }) {
  return <div className="kpi"><span className="kpi-t">{t}</span><span className="kpi-v">{typeof v === "number" ? n(v) : v}</span>{s ? <span className="kpi-s">{s}</span> : null}</div>;
}

function Lista({ t, itens, solta }: { t?: string; itens: { k: string; v: number }[]; solta?: boolean }) {
  const max = Math.max(1, ...itens.map(i => i.v));
  const corpo = (
    <div className="lista">
      {itens.length ? itens.map(i => (
        <div key={i.k} className="lista-l"><span className="lista-k">{i.k}</span><span className="lista-b"><i style={{ width: (i.v / max) * 100 + "%" }} /></span><span className="lista-v">{n(i.v)}</span></div>
      )) : <p className="sub">Sem dados ainda.</p>}
    </div>
  );
  return solta ? corpo : <div className="card"><h3>{t}</h3>{corpo}</div>;
}

/** Barras de uma série só (cor única, base em zero, rótulo ao passar o mouse). */
function Barras({ t, s, dados, un, rotulos }: { t: string; s?: string; dados: { x: string; v: number; extra?: string }[]; un: string; rotulos?: "todos" }) {
  const W = 640, H = 180, B = 22, max = Math.max(1, ...dados.map(d => d.v));
  const passo = W / dados.length, larg = Math.max(2, passo - 2), r = Math.min(4, larg / 2);
  const total = dados.reduce((a, d) => a + d.v, 0);
  const rot = (i: number) => rotulos === "todos" ? (dados.length <= 12 || i % 3 === 0) : (i === 0 || i === dados.length - 1 || i === Math.floor(dados.length / 2));
  const fmtX = (x: string) => /^\d{4}-\d{2}-\d{2}$/.test(x) ? dm(x) : x;
  return (
    <div className="card">
      <div className="card-cab"><div><h3>{t}</h3>{s ? <p className="sub">{s}</p> : null}</div><span className="max">máx. {n(max)}</span></div>
      <svg viewBox={`0 0 ${W} ${H + B}`} className="barras" role="img" aria-label={`${t}: total ${total}`}>
        <line x1="0" x2={W} y1={H} y2={H} className="base" />
        {dados.map((d, i) => {
          const h = d.v ? Math.max(3, (d.v / max) * (H - 8)) : 0;
          const x = i * passo + 1;
          return (
            <g key={d.x} data-tip={`${fmtX(d.x)} · ${n(d.v)} ${un}${d.extra ? " · " + d.extra : ""}`}>
              <rect x={x - 1} y={0} width={passo} height={H} className="alvo" />
              {h ? <path d={`M${x} ${H}V${H - h + r}a${r} ${r} 0 0 1 ${r} ${-r}h${larg - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}V${H}Z`} className="barra" /> : null}
              {rot(i) ? <text x={x + larg / 2} y={H + 16} className="eixo">{fmtX(d.x)}</text> : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const DICA = `(function(){var d=document.getElementById("dica");document.addEventListener("pointermove",function(e){var g=e.target.closest&&e.target.closest("[data-tip]");if(!g){d.style.opacity=0;return;}d.textContent=g.getAttribute("data-tip");d.style.opacity=1;var x=Math.min(e.clientX+14,window.innerWidth-d.offsetWidth-8);d.style.transform="translate("+x+"px,"+(e.clientY+14)+"px)";});})();`;
