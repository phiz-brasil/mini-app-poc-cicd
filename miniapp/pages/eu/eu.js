// ---------------------------------------------------------------------------
// A página "Eu": todos os meus números (pontos, treinos, minutos, km,
// sequências), o calendário das últimas 5 semanas, os tipos de treino e a
// lista dos meus treinos — com apagar.
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var tipos = require("../../utils/tipos");
var marcas = require("../../utils/marcas");
var stravaU = require("../../utils/strava");
var cardU = require("../../utils/card");
var nivelU = require("../../utils/nivel");

var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function mil(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function km(n) { return String(n).replace(".", ","); }
function dataTxt(dia) {
  var d = new Date(dia + "T12:00:00");
  return SEMANA[d.getDay()] + ", " + d.getDate() + " " + MESES[d.getMonth()];
}

Page({
  data: {
    ic: ic, marcas: marcas, barTop: 44, barH: 32, carregando: true, erro: "",
    eu: null, cor: "#B08968", ini: "", sub: "",
    pts: {}, numeros: [], cal: [], calMes: "", tipos: [], treinos: [], toast: "",
    cab: ["S", "T", "Q", "Q", "S", "S", "D"],
  },

  onLoad: function (q) {
    var m = view.barMetrics();
    // ?uid= abre a página de outra pessoa (só leitura; some se ela fechou o perfil).
    this.alvo = (q && q.uid) || "";
    this.setData({ barTop: m.barTop, barH: m.barH });
    this.carregar();
  },

  onPullDownRefresh: function () {
    this.carregar().then(function () { pz.stopPullDownRefresh(); }, function () { pz.stopPullDownRefresh(); });
  },

  carregar: function () {
    var self = this;
    return api.api("GET", "/api/mini/perfil" + (this.alvo ? "?uid=" + encodeURIComponent(this.alvo) : "")).then(function (r) {
      if (r.status === 401) return api.entrar().then(function () { return self.carregar(); });
      if (r.status === 403 && r.data.privado) { self.setData({ carregando: false, erro: "", privado: r.data.nome || "Essa pessoa" }); return; }
      if (r.status !== 200) { self.setData({ carregando: false, erro: r.data.erro || "Não deu pra abrir." }); return; }
      self.desenhar(r.data);
    }, function () { self.setData({ carregando: false, erro: "Sem conexão." }); });
  },

  tagNivel: function (n) {
    var f = n.faixa;
    return { n: n.nivel, faixa: f.nome, selo: nivelU.selo(f.id) };
  },
  cardNivel: function (n) {
    var f = n.faixa;
    return {
      n: n.nivel, faixa: f.nome, ac: nivelU.acento(f), selo: nivelU.selo(f.id), num: nivelU.numero(n.nivel, f.id, 64),
      pct: Math.round(n.pct * 100), falta: mil(n.falta), prox: n.nivel + 1, xp: mil(n.xp), arte: n.arte || "",
    };
  },
  // Conquista: no meu perfil abre a arte pra postar; no dos outros, mostra o que é.
  abrirConquista: function (e) {
    var c = this.data.cqGanhas[e.currentTarget.dataset.i];
    if (!c) return;
    if (this.data.outro || !c.arte) { pz.showModal({ title: c.nome, content: c.descricao + (c.edicao ? "\n" + c.edicao : ""), showCancel: false, confirmText: "Legal" }); return; }
    getApp().globalData.arteNivel = { arte: c.arte, titulo: c.nome, sub: c.descricao + " Poste e mostre pra galera que tá pago.", ac: c.cor };
    pz.navigateTo({ url: "/pages/arte-nivel/arte-nivel" });
  },
  verBloqueada: function (e) {
    var c = this.data.cqBloq[e.currentTarget.dataset.i];
    if (c) pz.showModal({ title: c.nome, content: c.descricao + (c.quando ? "\n" + c.quando + "." : ""), showCancel: false, confirmText: "Bora" });
  },
  // Compartilhar a arte do meu nível a qualquer momento (canto do card).
  arteNivel: function () {
    var n = this.data.nivel;
    if (!n) return;
    getApp().globalData.arteNivel = n.arte ? { arte: n.arte, n: n.n, faixa: n.faixa, ac: n.ac } : null;
    pz.navigateTo({ url: "/pages/arte-nivel/arte-nivel" });
  },
  desenhar: function (p) {
    var eu = p.eu, t = p.tudo || {};
    // O @ do PhizChat é confidencial: nunca aparece, nem pra própria pessoa.
    var sub = p.outro ? "" : (eu.cidade || "");
    var maxMin = 1;
    (p.tipos || []).forEach(function (x) { if (x.min > maxMin) maxMin = x.min; });
    var cal = (p.calendario || []).map(function (c) {
      return { dia: c.dia, n: c.n, hoje: c.hoje, nivel: c.pts < 0 ? "fut" : c.pts === 0 ? "zero" : c.pts >= 30 ? "forte" : "ok" };
    });
    var hoje = new Date();
    this.setData({
      // Nível: só na página da própria pessoa (é pessoal; os outros não veem).
      nivel: !p.outro && p.nivel ? this.cardNivel(p.nivel) : null,
      // Conquistas: ganhas (com a data) e, no meu perfil, as bloqueadas que ainda dá pra ganhar.
      cqGanhas: ((p.conquistas || {}).ganhas || []).map(function (c) { var d = new Date(c.ganhaEm); c.quando = d.getDate() + " " + MESES[d.getMonth()] + " " + d.getFullYear(); return c; }),
      cqBloq: (p.conquistas || {}).bloqueadas || [],
      enf: ((getApp().globalData.tema || {}).enfeite) || null,
      // Tag embaixo do nome: no meu perfil e no dos outros.
      tagNivel: p.nivel ? this.tagNivel(p.nivel) : p.nivelTag ? this.tagNivel(p.nivelTag) : null,
      carregando: false, erro: "", outro: !!p.outro, primeiro: String(eu.nome || "").split(" ")[0], eu: eu, cor: tipos.corDe(eu.id), ini: tipos.iniciais(eu.nome), sub: sub,
      pts: {
        total: mil(t.pontos || 0), semana: (p.semana && p.semana.pontos) || 0, mes: (p.mes && p.mes.pontos) || 0,
        pos: p.posGeral ? p.posGeral + "º" : "–", de: p.totalGeral || 0, tapagos: p.tapagos || 0,
      },
      numeros: [
        { r: "Treinos", v: mil(t.treinos || 0), u: "" },
        { r: "Minutos", v: mil(t.min || 0), u: "min" },
        { r: "Distância", v: km(t.km || 0), u: "km" },
        { r: "Dias ativos", v: mil(t.dias || 0), u: "" },
        { r: "Sequência", v: p.seq || 0, u: (p.seq === 1 ? "dia" : "dias") },
        { r: "Melhor sequência", v: p.melhorSeq || 0, u: (p.melhorSeq === 1 ? "dia" : "dias") },
      ],
      trofeus: (p.trofeus || []).map(function (v) {
        var a = new Date(v.semana + "T12:00:00"), b = new Date(a.getTime() + 6 * 86400000);
        var un = v.un === "dias" || v.un === "dia" ? (v.valor === 1 ? "dia pago" : "dias pagos") : v.un;
        return { titulo: v.titulo, quando: "Semana de " + a.getDate() + " a " + b.getDate() + " " + MESES[b.getMonth()], valor: v.valor + " " + un };
      }),
      nTrofeus: (p.trofeus || []).length,
      cal: cal, calMes: MESES[hoje.getMonth()] + " " + hoje.getFullYear(),
      tipos: (p.tipos || []).slice(0, 6).map(function (x) {
        return { tipo: x.tipo, min: mil(x.min), n: x.n, w: Math.max(6, Math.round(x.min / maxMin * 100)) };
      }),
      treinos: (p.treinos || []).map(function (x) {
        return {
          id: x.id, foto: x.foto, mini: x.foto ? null : cardU.mini(x.k), tipo: x.titulo || x.tipo, data: dataTxt(x.dia),
          // A foto já diz que foi pela foto; Strava só ganha nome quando não tem o "View on Strava".
          linha: x.min + " min" + (x.km ? " · " + km(x.km) + " km" : "") + (x.fonte === "strava" && !x.noStrava ? " · Strava" : ""),
          duvida: x.duvida, pendente: x.pendenteFoto, tp: x.tp, noStrava: x.noStrava || "",
        };
      }),
      vazio: !(p.treinos || []).length,
      temStrava: (p.treinos || []).some(function (x) { return x.fonte === "strava"; }),
    });
  },

  verNoStrava: function (e) { stravaU.verNoStrava(e.currentTarget.dataset.url); },


  apagar: function (e) {
    var id = e.currentTarget.dataset.id, self = this;
    var item = null;
    this.data.treinos.forEach(function (x) { if (x.id === id) item = x; });
    if (!item) return;
    pz.showModal({
      title: "Apagar este treino?", content: item.tipo + " · " + item.data + ". Os pontos dele saem do ranking.",
      confirmText: "Apagar", confirmColor: "#E5484D", cancelText: "Manter",
      success: function (r) {
        if (!r.confirm) return;
        api.api("POST", "/api/mini/perfil", { acao: "apagar", id: id }).then(function (x) {
          if (x.status !== 200) { self.mostrar(x.data.erro || "Não deu pra apagar."); return; }
          self.mostrar("Treino apagado");
          self.carregar();
        }, function () { self.mostrar("Sem conexão."); });
      },
    });
  },

  registrar: function () { pz.navigateTo({ url: "/pages/registrar/registrar" }); },
  abrirAjustes: function () { pz.navigateTo({ url: "/pages/ajustes/ajustes" }); },
  voltar: function () { pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } }); },

  mostrar: function (txt) {
    var self = this;
    this.setData({ toast: txt });
    clearTimeout(this.tt);
    this.tt = setTimeout(function () { self.setData({ toast: "" }); }, 2200);
  },
});
