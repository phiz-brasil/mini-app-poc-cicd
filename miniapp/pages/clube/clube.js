// ---------------------------------------------------------------------------
// Página do grupo, no jeito do clube do Strava: o ranking é o centro.
// Pódio dos 3 primeiros → "quanto falta pra passar" → lista → feed do grupo.
// Registrar treino fica num botão pequeno: aqui o assunto é a disputa.
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var tipos = require("../../utils/tipos");
var amigos = require("../../utils/amigos");
var stravaU = require("../../utils/strava");
var cardU = require("../../utils/card");

var UN = { dias: ["dia pago", "dias pagos"], duracao: ["min", "min"], distancia: ["km", "km"] };
var COMO = { dias: "Dias ativos", duracao: "Duração", distancia: "Distância" };
var PERIODO = { hoje: "hoje", semana: "na semana", mes: "no mês", total: "no geral" };
var METRICAS = [{ id: "dias", nome: "Dias ativos" }, { id: "duracao", nome: "Duração" }, { id: "distancia", nome: "Distância" }];

function ddmm(d) { return d ? d.slice(8, 10) + "/" + d.slice(5, 7) : ""; }
function hojeSP() { return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10); }

// Status do desafio (datas opcionais que o dono do grupo define).
function desafioTxt(d) {
  if (!d || (!d.inicio && !d.fim)) return "";
  if (d.comecaEm) return "Desafio começa em " + ddmm(d.comecaEm);
  if (d.encerrado) return "Desafio encerrado em " + ddmm(d.fim);
  if (d.inicio && d.fim) return "Desafio de " + ddmm(d.inicio) + " a " + ddmm(d.fim);
  return d.fim ? "Desafio até " + ddmm(d.fim) : "Desafio desde " + ddmm(d.inicio);
}

function un(metrica, v) { var u = UN[metrica] || UN.duracao; return v === 1 ? u[0] : u[1]; }
function fmt(v, metrica) { return metrica === "distancia" ? String(v).replace(".", ",") : String(v); }

function quando(iso) {
  var t = Date.parse(iso), d = (Date.now() - t) / 60000;
  if (d < 2) return "agora";
  if (d < 60) return "há " + Math.round(d) + " min";
  if (d < 24 * 60) return "há " + Math.round(d / 60) + " h";
  if (d < 48 * 60) return "ontem";
  var dt = new Date(t);
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][dt.getDay()] + ", " + dt.getDate() + "/" + (dt.getMonth() + 1);
}

function com(o, extra) { var n = {}; for (var k in o) n[k] = o[k]; for (var j in extra) n[j] = extra[j]; return n; }

function pessoa(r, euId) {
  return {
    uid: r.uid, eu: r.uid === euId, nome: r.uid === euId ? "Você" : String(r.nome || "").split(" ")[0],
    avatar: r.avatar || "", cor: tipos.corDe(r.uid), ini: tipos.iniciais(r.nome || "?"), verificado: !!r.verificado, trofeus: r.trofeus || 0, treinouHoje: !!r.treinouHoje, cutuquei: !!r.cutuquei,
  };
}

Page({
  data: {
    ic: ic, cutucarOn: !!getApp().globalData.cutucar, barTop: 44, barH: 32, conteudoTop: 88,
    carregando: true, erro: "", periodo: "total", desafio: "", ed: null,
    grupo: null, como: "", membrosTxt: "", rosto: [], mais: 0,
    podio: [], resto: [], escondidos: 0, meu: null, total: 0, falta: "", feed: [], vazio: false, toast: "",
  },

  onLoad: function (q) {
    var m = view.barMetrics();
    this.id = (q && q.id) || "";
    this.abrirConvite = !!(q && q.convidar);
    this.dados = {};
    this.setData({ barTop: m.barTop, barH: m.barH, conteudoTop: m.conteudoTop });
    this.carregar();
  },

  onPullDownRefresh: function () {
    this.carregar().then(function () { pz.stopPullDownRefresh(); }, function () { pz.stopPullDownRefresh(); });
  },

  carregar: function () {
    var self = this;
    return api.api("GET", "/api/mini/grupo?id=" + this.id + "&periodo=" + this.data.periodo).then(function (r) {
      if (r.status === 401) return api.entrar().then(function () { return self.carregar(); });
      if (r.status !== 200) { self.setData({ carregando: false, erro: r.data.erro || "Não deu pra abrir o grupo." }); return; }
      self.p = r.data;
      self.desenhar();
      if (self.data.rkTroca) {
        var espera = Math.max(0, 180 - (Date.now() - (self.rkDesde || 0)));
        setTimeout(function () { self.setData({ rkTroca: false, rkAnim: true }); }, espera);
      }
      if (self.abrirConvite) { self.abrirConvite = false; self.convidar(); }
    }, function () { self.setData({ carregando: false, erro: "Sem conexão.", rkTroca: false }); });
  },

  desenhar: function () {
    var p = this.p, self = this;
    var euId = (getApp().globalData.eu || {}).id || "";
    var met = p.metrica, per = p.periodo;
    var rk = (p.ranking || []).map(function (r, i) {
      var o = pessoa(r, euId);
      o.cutuquei = o.cutuquei || !!self.dados["c" + r.uid];
      o.pos = i + 1; o.valor = fmt(r.valor, met); o.un = un(met, r.valor); o.v = r.valor;
      // "28 pts / 2 dias": métrica do grupo em cima, e o complemento depois da barra.
      o.sub = met === "dias" ? (r.pontos || 0) + " pts" : r.dias + (r.dias === 1 ? " dia pago" : " dias pagos");
      return o;
    });
    // Pódio na ordem 2º · 1º · 3º (o 1º no meio, mais alto).
    var top = rk.slice(0, 3), podio = [];
    if (top[1]) podio.push(com(top[1], { lugar: 2 }));
    if (top[0]) podio.push(com(top[0], { lugar: 1 }));
    if (top[2]) podio.push(com(top[2], { lugar: 3 }));

    var meu = null, acima = null;
    rk.forEach(function (r, i) { if (r.eu) { meu = r; acima = i > 0 ? rk[i - 1] : null; } });
    var falta = "";
    if (meu && meu.pos === 1 && meu.v > 0) falta = "Você lidera " + PERIODO[per] + ". Segura essa!";
    else if (meu && acima) {
      var d = Math.round((acima.v - meu.v) * 10) / 10;
      falta = d > 0 ? (d === 1 ? "Falta " : "Faltam ") + fmt(d, met) + " " + un(met, d) + " pra passar " + acima.nome : "Empatado com " + acima.nome + ". Um treino desempata!";
    }

    var feed = (p.feed || []).map(function (t) {
      var o = pessoa(t, euId);
      var dei = !!(t.deiTp || self.dados[t.uid + t.dia]);
      o.id = t.id; o.foto = t.foto || ""; o.quando = quando(t.criadoEm);
      o.strava = !!t.strava; o.pontos = t.pontos; o.card = o.foto ? null : cardU.card(t.card);
      o.linha = (t.titulo ? t.titulo + " · " : "") + t.tipo + " · " + t.min + " min" + (t.km ? " · " + fmt(t.km, "distancia") + " km" : "");
      o.noStrava = t.noStrava || "";
      o.podeTp = !o.eu && t.dia === p.hoje; o.dei = dei; o.dia = t.dia;
      o.tp = t.tp + (self.dados[t.uid + t.dia] && !t.deiTp ? 1 : 0);
      return o;
    });

    var membros = p.membros || [];
    this.setData({
      carregando: false, erro: "", grupo: p.grupo, como: COMO[met] || "", desafio: desafioTxt(p.desafio),
      membrosTxt: p.grupo.membros + (p.grupo.membros === 1 ? " pessoa" : " pessoas"),
      rosto: membros.slice(0, 5).map(function (m) { return pessoa(m, ""); }), mais: Math.max(0, p.grupo.membros - 5),
      enf: ((getApp().globalData.tema || {}).enfeite) || null,
      podio: podio, resto: rk.slice(3, this.todos ? rk.length : 10), escondidos: this.todos ? 0 : Math.max(0, rk.length - 10),
      meu: meu, total: rk.length, falta: falta,
      feed: feed, vazio: !feed.length, sozinho: p.grupo.membros <= 1,
    });
  },

  /* ── Editar grupo (só quem criou): nome, como conta e datas opcionais ── */
  editarGrupo: function () {
    var g = this.data.grupo;
    if (!g || !g.souCriador) return;
    this.setData({ ed: { nome: g.nome, metrica: g.metrica, comData: !!(g.inicio || g.fim), inicio: g.inicio || hojeSP(), fim: g.fim || "", metricas: METRICAS, salvando: false } });
  },
  edNome: function (e) { this.setData({ "ed.nome": e.detail.value }); },
  edMetrica: function (e) { this.setData({ "ed.metrica": e.currentTarget.dataset.m }); },
  edComData: function (e) { this.setData({ "ed.comData": e.currentTarget.dataset.v === "1" }); },
  edInicio: function (e) { this.setData({ "ed.inicio": e.detail.value }); },
  edFim: function (e) { this.setData({ "ed.fim": e.detail.value }); },
  edLimparFim: function () { this.setData({ "ed.fim": "" }); },
  fecharEdicao: function () { this.setData({ ed: null }); },
  salvarGrupo: function () {
    var self = this, ed = this.data.ed;
    if (!ed || ed.salvando) return;
    if (String(ed.nome || "").trim().length < 2) { this.mostrar("Dá um nome pro grupo."); return; }
    if (ed.comData && ed.fim && ed.fim < ed.inicio) { this.mostrar("O fim tem que ser depois do início."); return; }
    this.setData({ "ed.salvando": true });
    api.api("POST", "/api/mini/grupos", { acao: "editar", id: this.id, nome: ed.nome, metrica: ed.metrica,
      inicio: ed.comData ? ed.inicio : "", fim: ed.comData ? ed.fim : "" }).then(function (r) {
      if (r.status !== 200) { self.setData({ "ed.salvando": false }); self.mostrar(r.data.erro || "Não deu pra salvar."); return; }
      self.setData({ ed: null });
      self.mostrar("Grupo atualizado ✅");
      self.carregar();
    }, function () { self.setData({ "ed.salvando": false }); self.mostrar("Sem conexão."); });
  },

  verTodos: function () { this.todos = true; this.desenhar(); },

  trocarPeriodo: function (e) {
    var per = e.currentTarget.dataset.p;
    if (per === this.data.periodo) return;
    // Motion: a lista sai na hora e entra de novo (pódio pula, linhas uma a uma).
    this.rkDesde = Date.now();
    this.setData({ periodo: per, rkTroca: true, rkAnim: false });
    this.carregar();
  },

  darTp: function (e) {
    var uid = e.currentTarget.dataset.uid, dia = e.currentTarget.dataset.dia, self = this;
    var item = null;
    this.data.feed.forEach(function (t) { if (t.uid === uid && t.dia === dia) item = item || t; });
    if (!item || item.dei || !item.podeTp) return;
    this.dados[uid + dia] = true;
    this.desenhar();
    this.mostrar("Tá pago pra " + item.nome + "!");
    try { pz.vibrateShort({ type: "light" }); } catch (err) {}
    api.api("POST", "/api/mini/tapago", { para: uid }).then(function (r) {
      if (r.status !== 200) { delete self.dados[uid + dia]; self.desenhar(); self.mostrar("Não deu certo. Tenta de novo."); }
    });
  },


  copiarCodigo: function () {
    var g = this.data.grupo;
    if (!g) return;
    var eu = String((getApp().globalData.eu || {}).nome || "").split(" ")[0];
    var txt = (eu ? eu + " te chamou pro " : "Bora pro ") + g.nome + " no Tá Pago! 💪\n\nAbre o miniapp Tá Pago! no PhizChat, toca em \"Tenho um código\" e digita: " + g.codigo;
    pz.setClipboardData({ data: txt, success: function () { pz.showToast({ title: "Convite copiado", icon: "none" }); } });
  },

  onShareAppMessage: function () {
    var g = this.data.grupo;
    if (!g) return { title: "Bora treinar junto no Tá Pago! 💪", path: "/pages/index/index" };
    return {
      title: "Vem pro " + g.nome + " 💪",
      path: "/pages/index/index?convite=" + g.codigo,
      imageUrl: "https://phizchat-tapago.vercel.app/api/convite/" + g.codigo + ".png",
    };
  },

  // Cutucar (só dentro do grupo): vira mensagem no chat de quem ainda não treinou hoje.
  cutucar: function (e) {
    var uid = e.currentTarget.dataset.uid, self = this, alvo = null;
    (this.p.ranking || []).forEach(function (r) { if (r.uid === uid) alvo = r; });
    if (!alvo || this.dados["c" + uid] || alvo.cutuquei) return;
    this.dados["c" + uid] = true;
    this.desenhar();
    try { pz.vibrateShort({ type: "medium" }); } catch (err) {}
    var nome = String(alvo.nome || "").split(" ")[0];
    api.api("POST", "/api/mini/cutucar", { para: uid, grupo: this.id }).then(function (r) {
      if (r.status !== 200) { delete self.dados["c" + uid]; self.desenhar(); self.mostrar(r.data.erro || "Não deu pra cutucar."); return; }
      self.mostrar(r.data.chat === "enviado" ? "Cutucada enviada pro chat de " + nome + " 👀" : "Você cutucou " + nome + " 👀");
    }, function () { delete self.dados["c" + uid]; self.desenhar(); self.mostrar("Sem conexão."); });
  },

  /* ── Convidar amigos do PhizChat (seletor nosso; o share fica de plano B) ── */
  convidar: function () {
    var self = this;
    if (this.data.cv) return;
    this.setData({ cv: { carregando: true, lista: [], sel: 0, enviando: false, plano: "" } });
    Promise.all([
      amigos.buscar(),
      api.api("POST", "/api/mini/grupos", { acao: "quem", id: this.id }).then(function (r) { return r.data || {}; }, function () { return {}; }),
    ]).then(function (res) {
      var a = res[0], q = res[1], membros = q.membros || [], convidados = q.convidados || [];
      if (!a.lista.length) { self.setData({ cv: { carregando: false, lista: [], sel: 0, plano: "share" } }); return; }
      var lista = a.lista.map(function (x) {
        var dentro = membros.indexOf(x.phizId) >= 0, ja = convidados.indexOf(x.phizId) >= 0;
        return { phizId: x.phizId, nome: x.nome || "Amigo", avatar: x.avatar, cor: tipos.corDe(x.phizId), ini: tipos.iniciais(x.nome || "?"),
          dentro: dentro, ja: ja, on: false };
      }).sort(function (x, y) { return (x.dentro - y.dentro) || (x.ja - y.ja) || x.nome.localeCompare(y.nome); });
      self.setData({ cv: { carregando: false, lista: lista, sel: 0, plano: "" } });
    });
  },
  marcarAmigo: function (e) {
    var i = Number(e.currentTarget.dataset.i), it = this.data.cv.lista[i];
    if (!it || it.dentro || it.ja) return;
    var o = {}; o["cv.lista[" + i + "].on"] = !it.on; o["cv.sel"] = this.data.cv.sel + (it.on ? -1 : 1);
    this.setData(o);
  },
  enviarConvites: function () {
    var self = this, cv = this.data.cv;
    if (!cv || !cv.sel || cv.enviando) return;
    var esc = cv.lista.filter(function (x) { return x.on; }).map(function (x) { return { phizId: x.phizId, nome: x.nome }; });
    this.setData({ "cv.enviando": true });
    api.api("POST", "/api/mini/grupos", { acao: "convidar", id: this.id, amigos: esc }).then(function (r) {
      if (r.status !== 200) { self.setData({ "cv.enviando": false }); self.mostrar(r.data.erro || "Não deu pra convidar."); return; }
      self.setData({ cv: null });
      var n = r.data.convidados || 0;
      self.mostrar(n ? (n === 1 ? "Convite enviado! Aparece quando ela abrir o Tá Pago! 💌" : n + " convites enviados! Aparecem quando abrirem o Tá Pago! 💌") : "Essa galera já estava convidada.");
    }, function () { self.setData({ "cv.enviando": false }); self.mostrar("Sem conexão."); });
  },
  fecharConvite: function () { this.setData({ cv: null }); },
  nada: function () {},

  verNoStrava: function (e) { stravaU.verNoStrava(e.currentTarget.dataset.url); },

  // Tocar numa pessoa: a minha abre o Eu; a dos outros abre a página dela (se ela deixou pública).
  tocarEu: function (e) {
    var d = e.currentTarget.dataset;
    if (d.eu) pz.navigateTo({ url: "/pages/eu/eu" });
    else if (d.uid) pz.navigateTo({ url: "/pages/eu/eu?uid=" + d.uid });
  },

  registrar: function () { pz.navigateTo({ url: "/pages/registrar/registrar" }); },

  sair: function () {
    var self = this, g = this.data.grupo;
    if (!g) return;
    pz.showModal({
      title: "Sair do " + g.nome + "?", content: "Você some do ranking do grupo. Dá pra voltar com o código.",
      confirmText: "Sair", confirmColor: "#E5484D", cancelText: "Ficar",
      success: function (r) {
        if (!r.confirm) return;
        api.api("POST", "/api/mini/grupos", { acao: "sair", id: g.id }).then(function () {
          getApp().globalData.aviso = "Você saiu do " + g.nome;
          self.voltar();
        });
      },
    });
  },

  voltar: function () { pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } }); },

  mostrar: function (txt) {
    var self = this;
    this.setData({ toast: txt });
    clearTimeout(this.tt);
    this.tt = setTimeout(function () { self.setData({ toast: "" }); }, 2200);
  },
});
