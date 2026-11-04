// ---------------------------------------------------------------------------
// Arte do meu nível (ou de uma conquista: globalData.arteNivel traz titulo/sub): a mesma da comemoração, pra postar quando quiser.
// Abre pelo botão de compartilhar no card do nível (Eu) e por Ajustes.
// Os dados chegam por getApp().globalData.arteNivel ({ arte, n, faixa, ac });
// sem eles, busca o nível na página "Eu".
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var compartilhar = require("../../utils/compartilhar");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var nivelU = require("../../utils/nivel");

Page({
  data: { ic: ic, barTop: 44, barH: 32, arte: "", n: 0, faixa: "", titulo: "", sub: "", ac: "#C6F432", ocupado: "", aviso: "" },

  onLoad: function () {
    var m = view.barMetrics();
    this.setData({ barTop: m.barTop, barH: m.barH });
    var d = getApp().globalData.arteNivel;
    if (d && d.arte) { this.setData(d); return; }
    var self = this;
    api.api("GET", "/api/mini/perfil").then(function (r) {
      var nv = r.status === 200 && r.data.nivel;
      if (!nv || !nv.arte) { self.setData({ aviso: "Não deu pra abrir a arte agora." }); return; }
      self.setData({ arte: nv.arte, n: nv.nivel, faixa: nv.faixa.nome, ac: nivelU.acento(nv.faixa) });
    }, function () { self.setData({ aviso: "Sem conexão." }); });
  },

  postar: function () {
    var self = this;
    if (!this.data.arte || this.data.ocupado) return;
    this.setData({ ocupado: "post" });
    compartilhar.postarNoMeuMoments(this.data.arte).then(function (r) {
      self.setData({ ocupado: "", aviso: r === "menu" ? "Escolha Moments pra postar 🚀" : r === "salvo" ? "Imagem salva! Agora é só postar no seu Moments 🚀" : "Segure a imagem pra salvar e postar 🚀" });
    });
  },

  salvar: function () {
    var self = this, arte = this.data.arte;
    if (!arte || this.data.ocupado) return;
    var abrir = function () { self.setData({ ocupado: "" }); pz.previewImage({ urls: [arte], current: arte }); };
    this.setData({ ocupado: "salvar" });
    pz.downloadFile({
      url: arte,
      success: function (r) {
        if (r.statusCode !== 200) return abrir();
        pz.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: function () { self.setData({ ocupado: "", aviso: "Salvo no seu celular 📸" }); },
          fail: abrir,
        });
      },
      fail: abrir,
    });
  },

  ampliar: function () { if (this.data.arte) pz.previewImage({ urls: [this.data.arte], current: this.data.arte }); },
  voltar: function () { pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } }); },
});
