// ---------------------------------------------------------------------------
// Registrar treino à mão. Regra do produto: SEM FOTO NÃO ENTRA.
//
// A câmera é a do aparelho (sourceType só "camera", sem galeria). O servidor
// também recusa sem foto — esta tela só não deixa nem tentar.
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var tipos = require("../../utils/tipos");
var camera = require("../../utils/camera");
var icTipos = require("../../utils/icones-tipos");
var vis = require("../../utils/visivel");

// Quando a IA não manda título, vai um destes (e um emoji) no aviso da foto recusada.
var ZOEIRA = [
  ["🤨", "Esse treino tá estranho…"], ["🧸", "Tá fofo demais esse treino"], ["🛋️", "Treino de sofá não vale"],
  ["🕵️", "Cadê o suor nessa foto?"], ["😅", "Quase colou, hein"], ["🐢", "Bora treinar de verdade?"],
];
var EMOJI = ["🤨", "🧐", "😅", "🕵️", "🙃", "😂"];

Page({
  data: {
    ic: ic, barTop: 44, barH: 32, conteudoTop: 88,
    tipos: tipos.TIPOS.map(function (t) { return { k: t[0], l: t[1], ic: icTipos[t[0]] || icTipos.outro }; }),
    quem: [], recusada: "", zoeira: null, tipo: "funcional", min: 45, comKm: false, km: 0, kmTxt: "Sem km", maxDia: tipos.MANUAL_MAX_DIA,
    foto: "", fotoW: 0, fotoH: 0, hora: "", enviando: false, erro: "", destaques: false,
  },

  onLoad: function () {
    var self = this;
    vis.carregarGrupos().then(function (gs) { self.setData({ quem: vis.opcoes(gs) }); });
    var m = view.barMetrics();
    this.setData({ barTop: m.barTop, barH: m.barH, conteudoTop: m.conteudoTop });
  },

  voltar: function () { pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } }); },

  tirarFoto: function () {
    var self = this;
    var pronta = function (caminho) {
      var agora = new Date();
      var hora = ("0" + agora.getHours()).slice(-2) + ":" + ("0" + agora.getMinutes()).slice(-2);
      self.setData({ foto: caminho, hora: hora, erro: "", recusada: "" });
      try {
        pz.getImageInfo({ src: caminho, success: function (i) { self.setData({ fotoW: i.width, fotoH: i.height }); } });
      } catch (e) {}
    };
    camera.tirar(pronta);
  },

  tocarCam: function () { if (!this.data.foto) this.tirarFoto(); },

  alternarQuem: function (e) {
    var i = Number(e.currentTarget.dataset.i), o = {};
    o["quem[" + i + "].on"] = !this.data.quem[i].on;
    this.setData(o);
  },

  escolherTipo: function (e) {
    var k = e.currentTarget.dataset.k;
    var comKm = tipos.TIPOS_COM_KM.indexOf(k) >= 0;
    this.setData({ tipo: k, comKm: comKm });
    if (!comKm) this.mudarKm(0);
  },
  // Distância à mão é opcional (vale pros grupos de distância e soma pontos): passo de 0,5 km.
  mudarKm: function (km) {
    km = Math.max(0, Math.min(100, Math.round(km * 2) / 2));
    this.setData({ km: km, kmTxt: km ? String(km).replace(".", ",") + " km" : "Sem km" });
  },
  menosKm: function () { this.mudarKm(this.data.km - 0.5); },
  maisKm: function () { this.mudarKm(this.data.km ? this.data.km + 0.5 : 1); },
  menos: function () { this.setData({ min: Math.max(tipos.MIN_MIN, this.data.min - 5) }); },
  mais: function () { this.setData({ min: Math.min(tipos.MIN_MAX, this.data.min + 5) }); },

  // Foto recusada: aviso grande por cima de tudo, com zoeira, pra chamar atenção.
  zoar: function (titulo, motivo) {
    var z = ZOEIRA[Math.floor(Math.random() * ZOEIRA.length)];
    this.setData({
      enviando: false, foto: "", recusada: motivo || "Essa foto não parece de treino.",
      zoeira: { emoji: titulo ? EMOJI[Math.floor(Math.random() * EMOJI.length)] : z[0], titulo: titulo || z[1], motivo: motivo || "Tira uma foto do treino de verdade e entra no ranking." },
    });
    try { pz.vibrateLong(); } catch (e) {}
  },
  nada: function () {},
  // O treino já entrou pelo Strava: a foto vai nele (não cria outro, não duplica pontos).
  jaDoStrava: function (d) {
    var self = this;
    this.setData({ enviando: false });
    pz.showModal({
      title: "Esse treino já veio do Strava", content: (d.titulo ? "\"" + d.titulo + "\" " : "") + "já está salvo e contando pontos. Quer colocar essa foto nele?",
      confirmText: "Pôr a foto", cancelText: "Agora não",
      success: function (m) {
        if (!m.confirm) return;
        self.setData({ enviando: true });
        api.enviarFoto("/api/mini/treinos/foto", self.data.foto, { treinoId: d.stravaId }).then(function (r) {
          self.setData({ enviando: false });
          if (r.status === 422) { self.zoar(r.data.titulo, r.data.erro); return; }
          if (r.status !== 200) { self.setData({ erro: r.data.erro || "Não deu pra salvar a foto." }); return; }
          getApp().globalData.aviso = "Foto adicionada no treino do Strava ✅";
          pz.navigateBack();
        }, function () { self.setData({ enviando: false, erro: "Sem conexão." }); });
      },
    });
  },
  fecharZoeira: function () { this.setData({ zoeira: null }); },
  outraFoto: function () { this.setData({ zoeira: null }); this.tirarFoto(); },

  registrar: function () {
    var self = this;
    if (!this.data.foto || this.data.enviando) return;
    this.setData({ enviando: true, erro: "" });
    var vai = function () {
      return api.enviarFoto("/api/mini/treinos", self.data.foto, {
        tipo: self.data.tipo, min: String(self.data.min), km: String(self.data.comKm ? self.data.km : 0), visivel: JSON.stringify(vis.paraEnviar(self.data.quem)), w: String(self.data.fotoW || 0), h: String(self.data.fotoH || 0),
      });
    };
    vai().then(function (r) {
      if (r.status === 401) return api.entrar().then(vai);
      return r;
    }).then(function (r) {
      // 422 = a conferência da foto recusou: some a foto e o motivo fica no lugar dela.
      if (r.status === 422) { self.zoar(r.data.titulo, r.data.erro); return; }
      if (r.status === 409 && r.data.stravaId) { self.jaDoStrava(r.data); return; }
      if (r.status !== 200) { self.setData({ enviando: false, erro: r.data.erro || "Não deu pra registrar agora." }); return; }
      // Vai pra comemoração. redirectTo: o "voltar" de lá cai direto na home.
      var nomeTipo = "";
      self.data.tipos.forEach(function (t) { if (t.k === self.data.tipo) nomeTipo = t.l; });
      getApp().globalData.parabens = {
        treinoId: r.data.treino && r.data.treino.id, arte: r.data.arte || "", resumo: r.data.resumo || {},
        foto: self.data.foto, min: self.data.min, tipoTxt: nomeTipo, genero: (getApp().globalData.eu || {}).genero,
      };
      pz.redirectTo({ url: "/pages/parabens/parabens" });
    }).catch(function (e) {
      self.setData({ enviando: false, erro: e.message || "Sem conexão." });
    });
  },
});
