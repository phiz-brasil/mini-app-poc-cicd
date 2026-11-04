// ---------------------------------------------------------------------------
// Criar um grupo e convidar pelo chat. O convite é o próprio miniapp
// encaminhado pra uma conversa (open-type="share"): quem toca no cartão abre o
// Tá Pago! com ?convite=<código> e entra no grupo sozinho.
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var view = require("../../utils/view");
var ic = require("../../utils/icones");

function hojeSP() { return new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10); }
function somarDias(d, n) { var x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function ddmm(d) { return d ? d.slice(8, 10) + "/" + d.slice(5, 7) + "/" + d.slice(0, 4) : ""; }
var PRAZOS = [{ k: 7, l: "1 semana" }, { k: 30, l: "1 mês" }, { k: 90, l: "3 meses" }];

var IDEIAS = ["Corre da Firma", "Família Fit", "Pelada de quinta", "Bonde da academia", "Pedal de domingo"];

Page({
  data: {
    metricas: [
      { k: "dias", l: "Dias ativos", s: "Ganha quem treina mais dias. Bom pra criar hábito." },
      { k: "duracao", l: "Duração", s: "Ganha quem soma mais minutos de treino." },
      { k: "distancia", l: "Distância", s: "Ganha quem soma mais km. Pra corrida, bike e caminhada." },
    ],
    metrica: "dias", metricaTxt: "",
    // Duração do desafio (opcional): sem data = ranking corre pra sempre.
    comData: false, inicio: "", fim: "", inicioTxt: "", fimTxt: "", prazos: PRAZOS, prazo: 30, desafioTxt: "",
    ic: ic, barTop: 44, barH: 32, nome: "", ideias: IDEIAS, criando: false, grupo: null, erro: "", modoEntrar: false, codigo: "" },

  onLoad: function (q) {
    var m = view.barMetrics();
    var hoje = hojeSP(), fim = somarDias(hoje, 29);
    this.setData({ barTop: m.barTop, barH: m.barH, modoEntrar: !!(q && q.entrar), hoje: hoje,
      inicio: hoje, fim: fim, inicioTxt: ddmm(hoje), fimTxt: ddmm(fim) });
  },

  // Plano B do convite (funciona mesmo sem o miniapp publicado): copiar o
  // texto com o código e colar em qualquer conversa.
  copiarConvite: function () {
    var g = this.data.grupo;
    if (!g) return;
    var eu = String((getApp().globalData.eu || {}).nome || "").split(" ")[0];
    var txt = (eu ? eu + " te chamou pro " : "Bora pro ") + g.nome + " no Tá Pago! 💪\n\nAbre o miniapp Tá Pago! no PhizChat, toca em \"Tenho um código\" e digita: " + g.codigo;
    pz.setClipboardData({ data: txt, success: function () { pz.showToast({ title: "Convite copiado", icon: "none" }); } });
  },

  // Quem recebeu o código digita aqui.
  onCodigo: function (e) { this.setData({ codigo: String(e.detail.value || "").toUpperCase(), erro: "" }); },
  entrar: function () {
    var self = this;
    var c = String(this.data.codigo || "").trim();
    if (c.length < 6 || this.data.criando) return;
    this.setData({ criando: true });
    api.api("POST", "/api/mini/grupos", { acao: "entrar", codigo: c }).then(function (r) {
      if (r.status !== 200) { self.setData({ criando: false, erro: r.data.erro || "Código não encontrado." }); return; }
      getApp().globalData.irParaGrupo = r.data.grupo.id;
      getApp().globalData.aviso = r.data.novo ? "Você entrou no " + r.data.grupo.nome + " 🔥" : "Você já está no " + r.data.grupo.nome;
      self.voltar();
    }, function () { self.setData({ criando: false, erro: "Sem conexão." }); });
  },

  voltar: function () { pz.navigateBack({ fail: function () { pz.reLaunch({ url: "/pages/index/index" }); } }); },
  onNome: function (e) { this.setData({ nome: e.detail.value, erro: "" }); },
  escolherDuracao: function (e) { this.setData({ comData: e.currentTarget.dataset.v === "1", erro: "" }); },
  escolherPrazo: function (e) {
    var k = Number(e.currentTarget.dataset.k), fim = somarDias(this.data.inicio, k - 1);
    this.setData({ prazo: k, fim: fim, fimTxt: ddmm(fim), erro: "" });
  },
  onInicio: function (e) {
    var ini = e.detail.value, fim = this.data.fim;
    if (fim < ini) fim = somarDias(ini, (this.data.prazo || 30) - 1);
    this.setData({ inicio: ini, inicioTxt: ddmm(ini), fim: fim, fimTxt: ddmm(fim), erro: "" });
  },
  onFim: function (e) { this.setData({ fim: e.detail.value, fimTxt: ddmm(e.detail.value), prazo: 0, erro: "" }); },
  escolherMetrica: function (e) { this.setData({ metrica: e.currentTarget.dataset.k }); },
  usarIdeia: function (e) { this.setData({ nome: e.currentTarget.dataset.n, erro: "" }); },

  criar: function () {
    var self = this;
    var n = String(this.data.nome || "").trim();
    if (n.length < 2 || this.data.criando) return;
    var d = this.data;
    if (d.comData && d.fim < d.inicio) { this.setData({ erro: "O fim tem que ser depois do início." }); return; }
    this.setData({ criando: true });
    var corpo = { acao: "criar", nome: n, metrica: d.metrica };
    if (d.comData) { corpo.inicio = d.inicio; corpo.fim = d.fim; }
    api.api("POST", "/api/mini/grupos", corpo).then(function (r) {
      if (r.status !== 200) { self.setData({ criando: false, erro: r.data.erro || "Não deu pra criar." }); return; }
      var nomes = { dias: "dias ativos", duracao: "duração", distancia: "distância" };
      var g = r.data.grupo;
      self.setData({ criando: false, grupo: g, metricaTxt: nomes[g.metrica] || "",
        desafioTxt: g.inicio && g.fim ? "O desafio vai de " + ddmm(g.inicio).slice(0, 5) + " a " + ddmm(g.fim).slice(0, 5) + "." : "" });
      try { pz.vibrateShort({ type: "medium" }); } catch (e) {}
    }, function () { self.setData({ criando: false, erro: "Sem conexão." }); });
  },

  convidarAmigos: function () {
    if (this.data.grupo) pz.redirectTo({ url: "/pages/clube/clube?id=" + this.data.grupo.id + "&convidar=1" });
  },

  verRanking: function () {
    if (this.data.grupo) pz.redirectTo({ url: "/pages/clube/clube?id=" + this.data.grupo.id });
    else this.voltar();
  },

  onShareAppMessage: function () {
    var g = this.data.grupo;
    var eu = String((getApp().globalData.eu || {}).nome || "").split(" ")[0];
    return {
      title: g ? "Vem pro " + g.nome + " 💪" : "Bora treinar junto no Tá Pago! 💪",
      path: "/pages/index/index" + (g ? "?convite=" + g.codigo : ""),
      imageUrl: g ? "https://phizchat-tapago.vercel.app/api/convite/" + g.codigo + ".png" : "https://phizchat-tapago.vercel.app/marca/convite.png",
    };
  },
});
