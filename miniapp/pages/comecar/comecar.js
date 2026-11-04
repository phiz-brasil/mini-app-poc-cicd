// ---------------------------------------------------------------------------
// A porta de entrada (primeira vez): bem-vindo, conectar de onde vêm os treinos
// e Avançar. Aparece uma vez; depois as conexões ficam nos Ajustes.
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var view = require("../../utils/view");
var logo = require("../../utils/logo");
var marcas = require("../../utils/marcas");
var cx = require("../../utils/conexoes");
var telefone = require("../../utils/telefone");

Page({
  data: {
    marcas: marcas, icone: logo.ICONE, conteudoTop: 88, ic: require("../../utils/icones"),
    nome: "", strava: null, ocupado: false, indo: false,
  },

  onLoad: function () {
    var m = view.barMetrics();
    var eu = getApp().globalData.eu || {};
    this.setData({ conteudoTop: m.conteudoTop, barTop: m.barTop, nome: primeiro(eu.nome) });
  },

  // Abre antes do painel da home: busca o nome aqui. Na volta do OAuth do Strava, mostra "Conectado".
  onShow: function () {
    var self = this;
    api.api("GET", "/api/mini/painel").then(function (r) {
      if (r.status !== 200) return;
      var eu = r.data.eu;
      getApp().globalData.eu = eu;
      self.setData({ nome: primeiro(eu.nome), strava: (eu.conectados && eu.conectados.strava) || null });
    });
  },

  stravaNavegador: function () {
    cx.stravaPeloNavegador().catch(function () { pz.showToast({ title: "Não deu agora", icon: "none" }); });
  },

  strava: function () {
    var self = this;
    if (this.data.strava || this.data.ocupado) return;
    this.setData({ ocupado: true });
    cx.conectarStrava().then(function () { self.setData({ ocupado: false }); }, function () {
      self.setData({ ocupado: false });
      pz.showToast({ title: "Não deu agora", icon: "none" });
    });
  },
  garmin: function () { cx.explicarGarmin(); },

  // Responde no toque e sai na hora. Os avisos no chat ligam em segundo plano
  // (o botão getPhoneNumber do PhizChat não responde e travava a tela; o servidor usa a lista do beta).
  avancar: function () {
    if (this.data.indo) return;
    this.setData({ indo: true });
    try { pz.vibrateShort({ type: "light" }); } catch (e) {}
    var primeiraVez = true;
    try { primeiraVez = !pz.getStorageSync("tp_comecar_visto"); pz.setStorageSync("tp_comecar_visto", "1"); } catch (e) {}
    // Só na primeira vez (pelos Ajustes, não religa avisos que a pessoa desligou).
    var eu = getApp().globalData.eu;
    if (primeiraVez && (!eu || !eu.temTelefone)) telefone.enviar({ errMsg: "getPhoneNumber:entrada" });
    pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } });
  },
});

function primeiro(n) {
  var p = String(n || "").split(" ")[0];
  return p && p !== "Atleta" ? p : "";
}
