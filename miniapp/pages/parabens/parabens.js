// ---------------------------------------------------------------------------
// Parabéns: o treino entrou. Comemora, motiva e pergunta se quer postar
// nos Momentos (Clipes ficam de fora por enquanto). Os dados chegam por getApp().globalData.parabens
// (o registrar coloca lá antes de vir pra cá).
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var compartilhar = require("../../utils/compartilhar");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var logo = require("../../utils/logo");
var frases = require("../../utils/frases");

var CORES = ["#111111", "#FFFFFF", "#111111", "#2B3A0A", "#FFFFFF"];

Page({
  data: {
    ic: ic, conteudoTop: 88,
    tit: "Tá pago!", sub: "", foto: "", tipoTxt: "", min: 0, posTxt: "", seqTxt: "",
    momentos: true, enviando: false, feito: false, resultado: "", confete: [],
  },

  onLoad: function () {
    var m = view.barMetrics();
    var d = getApp().globalData.parabens || {};
    var r = d.resumo || {};
    r.genero = d.genero;
    var f = frases.frase(r);
    var confete = [];
    for (var i = 0; i < 26; i++) {
      confete.push({
        x: Math.round(Math.random() * 100), d: (Math.random() * 0.6).toFixed(2), t: (1.6 + Math.random() * 1.2).toFixed(2),
        w: 10 + Math.round(Math.random() * 10), cor: CORES[i % CORES.length], r: Math.round(Math.random() * 360),
      });
    }
    this.treinoId = d.treinoId;
    this.setData({
      conteudoTop: m.conteudoTop, barTop: m.barTop, tit: f.tit, sub: f.sub, foto: d.foto || "", tipoTxt: d.tipoTxt || "Treino",
      min: d.min || 0, posTxt: r.pos ? r.pos + "º de " + r.total : "", seqTxt: r.seq > 1 ? r.seq + " dias" : "",
      confete: confete,
    });
    try { pz.vibrateShort({ type: "medium" }); } catch (e) {}
  },

  // Postar no MEU Moments: menu de compartilhar do PhizChat (se existir) ou salvar a arte do treino.
  postar: function () {
    var self = this, arte = (getApp().globalData.parabens || {}).arte || this.arte;
    if (this.data.enviando) return;
    if (!arte) { this.setData({ feito: true, resultado: "Seu treino já está no ranking. A arte aparece no Moments do app." }); return; }
    this.arte = arte;
    this.setData({ enviando: true });
    compartilhar.postarNoMeuMoments(arte).then(function (r) {
      self.setData({ enviando: false, feito: true,
        resultado: r === "menu" ? "Escolha Moments pra postar 📸" : r === "salvo" ? "Arte salva no seu celular. Agora é só postar no seu Moments 📸" : "Segure a imagem pra salvar e postar 📸" });
      setTimeout(function () { self.agoraNao(); }, 2600);
    });
  },

  agoraNao: function () {
    getApp().globalData.parabens = null;
    pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } });
  },
});
