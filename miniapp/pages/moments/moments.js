// ---------------------------------------------------------------------------
// Moments: o que postar, pronto. Foto nova com um frame do Tá Pago! (selo,
// faixa ou moldura), a arte de um treino que já foi, o pódio da semana e os
// troféus. Tudo abre no mesmo visualizador: postar nos Moments, salvar ou
// mandar no chat. (O post automático depende da OpenAPI; até lá, salvar.)
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var camera = require("../../utils/camera");
var compartilhar = require("../../utils/compartilhar");

var NOMES = { selo: "Selo", faixa: "Faixa", moldura: "Borda" };
// Título do visualizador: diz o que é a imagem, não o nome técnico do frame.
var TITULO_FRAME = { selo: "Sua foto com o selo Tá Pago!", faixa: "Sua foto com a faixa Tá Pago!", moldura: "Sua foto com a borda Tá Pago!" };

Page({
  data: {
    ic: ic, barTop: 44, barH: 32, rolou: false, carregando: true,
    treinos: [], podios: [], campeoes: [],
    fr: null,      // { id, frames: [{frame, nome, arte}], sel }
    montando: false, ver: null, ocupado: "", toast: "",
  },

  onLoad: function () {
    compartilhar.ligarMenuDoPhiz();
    var m = view.barMetrics();
    this.setData({ barTop: m.barTop, barH: m.barH });
    this.carregar();
  },

  onPageScroll: function (e) {
    var r = e.scrollTop > 6;
    if (r !== this.rolou) { this.rolou = r; this.setData({ rolou: r }); }
  },

  carregar: function () {
    var self = this;
    api.api("GET", "/api/mini/moments").then(function (r) {
      if (r.status === 401) return api.entrar().then(function () { self.carregar(); });
      self.setData({ carregando: false, treinos: (r.data.treinos || []), podios: (r.data.podios || []), campeoes: (r.data.campeoes || []) });
    }, function () { self.setData({ carregando: false }); self.mostrar("Sem conexão."); });
  },

  /* Foto nova com moldura */
  tirarFoto: function () {
    var self = this;
    camera.tirar(function (caminho) {
      self.setData({ montando: true, fr: null });
      api.enviarFoto("/api/mini/moments/foto", caminho, {}).then(function (r) {
        if (r.status !== 200) { self.setData({ montando: false }); self.mostrar(r.data.erro || "Não deu pra montar as molduras."); return; }
        var frames = (r.data.frames || []).map(function (f) { return { frame: f.frame, nome: NOMES[f.frame] || f.frame, arte: f.arte }; });
        self.setData({ montando: false, fr: { id: r.data.id, frames: frames, sel: 0 } });
      }, function () { self.setData({ montando: false }); self.mostrar("Sem conexão."); });
    });
  },
  escolherFrame: function (e) { this.setData({ "fr.sel": Number(e.currentTarget.dataset.i) }); },
  usarFrame: function () {
    var fr = this.data.fr; if (!fr) return;
    var f = fr.frames[fr.sel];
    this.abrir({ tipo: "frame", id: fr.id, frame: f.frame, arte: f.arte, titulo: TITULO_FRAME[f.frame] || "Sua foto Tá Pago!" });
  },

  /* Abrir uma arte pronta no visualizador */
  abrirTreino: function (e) { var t = this.data.treinos[e.currentTarget.dataset.i]; this.abrir({ tipo: "treino", id: t.id, arte: t.arte, titulo: "Arte do treino · " + t.titulo }); },
  abrirPodio: function (e) { var p = this.data.podios[e.currentTarget.dataset.i]; this.abrir({ tipo: "podio", chave: p.chave, arte: p.arte, titulo: "Pódio da semana · " + p.titulo }); },
  abrirCampeao: function (e) { var c = this.data.campeoes[e.currentTarget.dataset.i]; this.abrir({ tipo: "campeao", id: c.id, arte: c.arte, titulo: "Seu troféu · " + c.titulo }); },
  abrir: function (v) { this.setData({ ver: v, ocupado: "", feito: "" }); },
  fechar: function () { this.setData({ ver: null }); },
  nada: function () {},

  // Postar no MEU Moments: menu de compartilhar do PhizChat (se existir) ou salvar a imagem.
  postar: function () {
    var self = this, v = this.data.ver;
    if (!v || this.data.ocupado) return;
    this.setData({ ocupado: "post" });
    compartilhar.postarNoMeuMoments(v.arte).then(function (r) {
      // O resultado fica na própria folha (o PhizChat ainda não deixa o miniapp postar direto no Moments).
      self.setData({ ocupado: "", feito: r === "finchat" || r === "menu" ? "menu" : r === "salvo" ? "salvo" : "aberto" });
    });
  },

  // Post pela conta Tá Pago! (OpenAPI). Desligado na tela até a credencial chegar.
  postarPelaConta: function () {
    var self = this, v = this.data.ver;
    if (!v || this.data.ocupado) return;
    this.setData({ ocupado: "post" });
    api.api("POST", "/api/mini/moments/postar", { tipo: v.tipo, id: v.id, frame: v.frame, chave: v.chave }).then(function (r) {
      self.setData({ ocupado: "" });
      if (r.status === 200 && r.data.momento === "publicado") { self.mostrar("Postado nos Moments! ✅"); self.fechar(); return; }
      self.mostrar(r.status !== 200 ? (r.data.erro || "Não deu pra postar.") : "O post automático nos Moments ainda não foi liberado. Salva a imagem e posta você 😉");
    }, function () { self.setData({ ocupado: "" }); self.mostrar("Sem conexão."); });
  },

  // Baixa e grava no álbum; se não der (permissão/domínio), abre a imagem pra segurar e salvar.
  salvar: function () {
    var self = this, v = this.data.ver;
    if (!v || this.data.ocupado) return;
    var abrir = function () { pz.previewImage({ urls: [v.arte], current: v.arte }); };
    this.setData({ ocupado: "salvar" });
    pz.downloadFile({
      url: v.arte,
      success: function (r) {
        if (r.statusCode !== 200) { self.setData({ ocupado: "" }); return abrir(); }
        pz.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: function () { self.setData({ ocupado: "" }); self.mostrar("Salvo no seu celular 📸"); },
          fail: function () { self.setData({ ocupado: "" }); abrir(); },
        });
      },
      fail: function () { self.setData({ ocupado: "" }); abrir(); },
    });
  },

  onShareTimeline: function () {
    var v = this.data.ver;
    return { title: "Tá pago! ✅ " + (v ? v.titulo : "Bora treinar junto"), imageUrl: v ? v.arte : "" };
  },

  onShareAppMessage: function () {
    var v = this.data.ver;
    if (v) return { title: "Tá pago! ✅ " + v.titulo, path: "/pages/index/index", imageUrl: v.arte };
    return { title: "Bora treinar junto no Tá Pago! 💪", path: "/pages/index/index" };
  },

  voltar: function () { pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } }); },

  mostrar: function (txt) {
    var self = this;
    this.setData({ toast: txt });
    clearTimeout(this.tt);
    this.tt = setTimeout(function () { self.setData({ toast: "" }); }, 2600);
  },
});
