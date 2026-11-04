var api = require("../../utils/api");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var marcas = require("../../utils/marcas");
var nivelU = require("../../utils/nivel");

Page({
  data: { versao: getApp().globalData.versao || "", ic: ic, marcas: marcas, barTop: 44, barH: 32, nome: "", aparecer: true, destaques: false, salvando: false,
    strava: null, stravaTx: "Treinos entram sozinhos", ocupado: false },

  onLoad: function () {
    var m = view.barMetrics();
    this.setData({ barTop: m.barTop, barH: m.barH });
  },

  // Volta do web-view do Strava: recarrega pra mostrar "Conectado".
  onShow: function () { this.carregar(); },

  carregar: function () {
    var self = this;
    api.api("GET", "/api/mini/painel").then(function (r) {
      if (r.status !== 200) return;
      var eu = r.data.eu, st = eu.conectados && eu.conectados.strava;
      self.desenharAvisos(eu);
      self.setData({
        temTelefone: !!eu.temTelefone, querAvisos: !!eu.querAvisos, avisosSaiu: eu.avisos === false,
        nivel: r.data.nivel ? r.data.nivel.nivel : 0,
        nivelArte: r.data.nivel && r.data.nivel.arte ? { arte: r.data.nivel.arte, n: r.data.nivel.nivel, faixa: r.data.nivel.faixa.nome, ac: nivelU.acento(r.data.nivel.faixa) } : null,
        nome: eu.nome, aparecer: eu.aparecer, perfilPublico: eu.perfilPublico !== false, destaques: eu.destaques, strava: st || null,
        stravaTx: st ? "Treinos entrando sozinhos" + (st.nome ? " · " + st.nome : "") : "Treinos entram sozinhos",
      });
    });
  },

  conectarStrava: function () {
    var self = this;
    if (this.data.ocupado) return;
    if (this.data.strava) return; // conectado: só o "Desconectar" pequeno mexe nisso
    this.setData({ ocupado: true });
    api.api("POST", "/api/mini/strava", { acao: "link" }).then(function (r) {
      self.setData({ ocupado: false });
      if (r.status !== 200 || !r.data.url) { pz.showToast({ title: "Não deu agora", icon: "none" }); return; }
      pz.navigateTo({ url: "/pages/web/web?u=" + encodeURIComponent(r.data.url) });
    }, function () { self.setData({ ocupado: false }); pz.showToast({ title: "Sem conexão", icon: "none" }); });
  },

  stravaNavegador: function () {
    require("../../utils/conexoes").stravaPeloNavegador().catch(function () { pz.showToast({ title: "Não deu agora", icon: "none" }); });
  },

  desconectarStrava: function () {
    var self = this;
    if (this.data.ocupado) return;
    pz.showModal({
      title: "Desconectar o Strava?", content: "Os treinos que já entraram continuam no ranking.", confirmText: "Desconectar", confirmColor: "#E5484D", cancelText: "Cancelar",
      success: function (m) {
        if (!m.confirm) return;
        self.setData({ ocupado: true });
        api.api("POST", "/api/mini/strava", { acao: "desconectar" }).then(function () { self.setData({ ocupado: false }); self.carregar(); });
      },
    });
  },

  // Estado dos avisos: recebendo / pedido feito (sem telefone ainda) / saiu / nunca pediu.
  desenharAvisos: function (eu) {
    var saiu = eu.avisos === false, tel = !!eu.temTelefone, pediu = !!eu.querAvisos;
    var tx = saiu ? "Desligados. Dá pra ligar de novo quando quiser"
      : tel ? "Ligados: seus treinos, cutucadas do grupo e o pódio de domingo"
      : pediu ? "Pedido feito ✓ Em breve você começa a receber no chat"
      : "Receba seus treinos, cutucadas e o pódio de domingo no chat";
    this.setData({ avisosOn: !saiu && (tel || pediu), avisosTx: tx });
  },

  trocarAvisos: function (e) {
    var self = this, ligar = !!e.detail.value;
    if (ligar) { this.mandarAvisos(true); return; }
    pz.showModal({
      title: "Desligar os avisos no chat?", content: "Você para de receber os treinos, as cutucadas e o pódio de domingo. Dá pra ligar de novo quando quiser.",
      confirmText: "Desligar", cancelText: "Manter",
      success: function (m) {
        if (!m.confirm) { self.setData({ avisosOn: false }); self.setData({ avisosOn: true }); return; }
        self.mandarAvisos(false);
      },
    });
  },
  mandarAvisos: function (ligar) {
    var self = this;
    api.api("POST", "/api/mini/eu", { avisos: ligar }).then(function (r) {
      if (r.status !== 200 || !r.data.usuario) { pz.showToast({ title: "Não deu agora", icon: "none" }); self.carregar(); return; }
      self.desenharAvisos(r.data.usuario);
      pz.showToast({ title: ligar ? (r.data.usuario.temTelefone ? "Avisos ligados ✅" : "Pedido feito ✅") : "Avisos desligados", icon: "none" });
    }, function () { pz.showToast({ title: "Sem conexão", icon: "none" }); self.carregar(); });
  },

  garmin: function () { require("../../utils/conexoes").explicarGarmin(); },
  verEntrada: function () { pz.navigateTo({ url: "/pages/comecar/comecar" }); },

  // A arte do meu nível, guardada pra postar quando quiser.
  verArteNivel: function () {
    getApp().globalData.arteNivel = this.data.nivelArte;
    pz.navigateTo({ url: "/pages/arte-nivel/arte-nivel" });
  },

  // Volta o "visto" um nível: a home abre de novo a comemoração do nível atual.
  reverNivel: function () {
    var n = this.data.nivel;
    if (!n) return;
    api.api("POST", "/api/mini/eu", { nivelVisto: n - 1 }).then(function () { pz.reLaunch({ url: "/pages/index/index" }); });
  },

  voltar: function () { pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } }); },

  salvar: function (patch) {
    var self = this;
    api.api("POST", "/api/mini/eu", patch).then(function (r) {
      if (r.status !== 200) pz.showToast({ title: r.data.erro || "Não deu pra salvar", icon: "none" });
    }, function () { pz.showToast({ title: "Sem conexão", icon: "none" }); });
  },

  onAparecer: function (e) { this.setData({ aparecer: e.detail.value }); this.salvar({ aparecer: e.detail.value }); },
  onPerfil: function (e) { this.setData({ perfilPublico: e.detail.value }); this.salvar({ perfilPublico: e.detail.value }); },
  onDestaques: function (e) { this.setData({ destaques: e.detail.value }); this.salvar({ destaques: e.detail.value }); },
  onNome: function (e) { this.setData({ nome: e.detail.value }); },
  salvarNome: function () {
    var n = String(this.data.nome || "").trim();
    if (n.length >= 2) { this.salvar({ nome: n }); pz.showToast({ title: "Nome salvo", icon: "none" }); }
  },

  // Apaga de verdade no servidor (treinos, fotos, pontos, grupos, Strava) e esquece o aparelho.
  apagarConta: function () {
    var self = this;
    if (self.data.apagando) return;
    pz.showModal({
      title: "Apagar sua conta?",
      content: "Seus treinos, fotos, pontos, troféus e grupos somem pra sempre e o Strava é desconectado. Não dá pra desfazer.",
      confirmText: "Apagar",
      confirmColor: "#E5484D",
      cancelText: "Cancelar",
      success: function (m) {
        if (!m.confirm) return;
        self.setData({ apagando: true });
        api.api("POST", "/api/mini/conta", { acao: "apagar", confirma: "APAGAR" }).then(function (r) {
          if (r.status !== 200 || !r.data.ok) throw new Error();
          api.esquecerAparelho();
          pz.showToast({ title: "Conta apagada", icon: "success" });
          setTimeout(function () { pz.reLaunch({ url: "/pages/index/index" }); }, 1200);
        }).catch(function () {
          self.setData({ apagando: false });
          pz.showToast({ title: "Não deu agora. Tente de novo.", icon: "none" });
        });
      },
    });
  },

  sair: function () {
    api.esquecer();
    pz.reLaunch({ url: "/pages/index/index" });
  },
});
