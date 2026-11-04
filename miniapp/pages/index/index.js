// ---------------------------------------------------------------------------
// A home: o dia da pessoa + o ranking (de todos ou de um grupo).
//
// O servidor manda tudo pronto (/api/mini/painel); aqui só vira tela — o .pxml
// não tem função. Grupos: abas no topo do ranking; "Convidar" encaminha o
// miniapp pro chat com ?convite=<código> e quem abre entra sozinho.
// ---------------------------------------------------------------------------
var api = require("../../utils/api");
var nivelU = require("../../utils/nivel");
var view = require("../../utils/view");
var ic = require("../../utils/icones");
var logo = require("../../utils/logo");
var tipos = require("../../utils/tipos");
var camera = require("../../utils/camera");
var marcas = require("../../utils/marcas");
var compartilhar = require("../../utils/compartilhar");
var stravaU = require("../../utils/strava");
var vis = require("../../utils/visivel");
var cardU = require("../../utils/card");

var DIAS = ["S", "T", "Q", "Q", "S", "S", "D"];
var MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

// Abertura: a home abre na hora com o último painel salvo (sem piscar "atleta")
// e atualiza por baixo. Só na primeira vez aparece a abertura com a marca.
var CACHE = "tp_painel_v1";
function frases() {
  var h = new Date().getHours();
  var oi = h < 5 ? "Treino de madrugada? Respeito." : h < 12 ? "Bom dia! Aquecendo…" : h < 18 ? "Boa tarde! Aquecendo…" : "Boa noite! Aquecendo…";
  return [oi, "Contando seus pontos…", "Vendo quem já treinou hoje…", "Alongando o ranking…", "Quase lá…"];
}

var UN = { pontos: "pts", dias: "dias", duracao: "min", distancia: "km" };
var COMO = { pontos: "Pontos Tá Pago!", dias: "Dias ativos", duracao: "Duração", distancia: "Distância" };

function fmt(v, metrica) {
  if (metrica === "distancia") return String(v).replace(".", ",");
  return String(v);
}

function juntar(nomes) {
  if (nomes.length === 1) return nomes[0] + " te cutucou";
  return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1] + " te cutucaram";
}

// Ranking compacto: top 5 + a minha linha (se eu estiver mais pra baixo). Expande pra lista toda.
function visivel(lista, expandido) {
  if (expandido || lista.length <= 5) return lista;
  var top = lista.slice(0, 5), eu = null;
  lista.forEach(function (l) { if (l.eu && l.pos > 5) eu = l; });
  if (eu) { var c = {}; for (var k in eu) c[k] = eu[k]; c.sep = true; top.push(c); }
  return top;
}

function quando(iso) {
  var d = (Date.now() - Date.parse(iso)) / 60000;
  if (d < 2) return "agora";
  if (d < 60) return "há " + Math.round(d) + " min";
  if (d < 1440) return "há " + Math.round(d / 60) + " h";
  if (d < 2880) return "ontem";
  var t = new Date(Date.parse(iso));
  return t.getDate() + "/" + (t.getMonth() + 1);
}

// Item da timeline: foto do app ou arte do meu Strava; Strava de outra pessoa vira cartão "Treinou + pts".
function itemTl(t) {
  var km = t.km ? " · " + String(t.km).replace(".", ",") + " km" : "";
  return {
    id: t.id, uid: t.uid, eu: t.eu, dia: t.dia, nomeTxt: t.eu ? "Você" : String(t.nome || "").split(" ")[0],
    avatar: t.avatar || "", cor: tipos.corDe(t.uid), ini: tipos.iniciais(t.nome || "?"), quando: quando(t.criadoEm), criadoEm: t.criadoEm,
    img: t.foto || "", strava: t.strava, pontos: t.pontos, card: t.foto ? null : cardU.card(t.card),
    linha: (t.titulo ? t.titulo + " · " : "") + t.tipo + " · " + t.min + " min" + km + " · +" + t.pontos + " pts",
    podeTp: !t.eu && t.dia === hojeSP(), dei: !!t.deiTp, tp: t.tp || 0,
  };
}

/**
 * Bloco limão de quem ainda não treinou hoje: uma chamada pra treinar, conforme o que pega mais.
 * Sequência em risco > dá pra passar alguém > a galera já treinou > ser o primeiro.
 */
function chamadaDoDia(p, lista, meu, metrica, rostosHoje) {
  var seq = p.seq || 0, acima = null;
  if (meu && meu.pos > 1) acima = lista[meu.pos - 2];
  var titulo, sub = "30 min de treino = +16 pts";
  if (seq >= 2) { titulo = "Não deixa a sequência de " + seq + " dias acabar"; sub = "Ela zera à meia-noite. " + sub; }
  else if (acima && metrica === "pontos" && (p.ranking[meu.pos - 2].valor - p.ranking[meu.pos - 1].valor) < 16) titulo = "Um treino hoje te põe na frente de " + String(acima.nomeTxt || "").split(" ")[0];
  else if (rostosHoje.length >= 2) titulo = rostosHoje.length + " pessoas já pagaram o de hoje. Falta você";
  else if (rostosHoje.length === 1) titulo = String(rostosHoje[0].nome || "").split(" ")[0] + " já pagou o de hoje. E você?";
  else titulo = "O primeiro tá pago do dia pode ser seu";
  var st = p.eu.conectados && p.eu.conectados.strava;
  return { titulo: titulo, sub: sub, seq: seq, strava: !!st };
}

// Confete do pouso (rpx): leque de pedacinhos na cor do selo/badge.
function leque(ac, ang0, ang1, n, atraso) {
  var l = [];
  for (var j = 0; j < n; j++) {
    var tipo = j % 5, w = tipo === 2 ? 6 : 6 + Math.round(Math.random() * 10);
    l.push({ k: j, cls: ["", "m", "l"][j % 3], a: Math.round(ang0 + Math.random() * (ang1 - ang0)), w: w,
      h: tipo === 2 ? w * 5 : tipo === 1 ? w : Math.round(w * 2.2), bola: tipo === 1,
      c: [ac, ac, "#FFFFFF", ac + "99", "#FFF6D6"][tipo], d: (atraso + Math.random() * 0.15).toFixed(2), du: (1.4 + Math.random() * 0.8).toFixed(2) });
  }
  return l;
}
function canhoesDe(ac) { return [{ lado: "", cf: leque(ac, -80, 80, 46, 0) }, { lado: "esq", cf: leque(ac, 8, 50, 22, 0.08) }, { lado: "dir", cf: leque(ac, -50, -8, 22, 0.08) }]; }
function poeira() { var po = []; for (var i = 0; i < 12; i++) po.push({ x: 240 + Math.round(Math.random() * 270), y: 400 + Math.round(Math.random() * 400), d: (Math.random() * 6).toFixed(2) }); return po; }
var ESTRELAS = [[-224, -140, 0], [236, -80, 0.5], [-184, 116, 1.1], [208, 148, 0.8], [-60, -256, 1.5], [120, -224, 0.3]].map(function (e) { return { x: e[0], y: e[1], d: e[2] }; });

// Tema do dia → estilos prontos pro card da home (vazios = visual padrão).
function estiloTema(t) {
  var c = t && t.card;
  if (!c) return null;
  return { card: "background: " + c.fundo, tinta: "color: " + c.tinta, apoio: "color: " + c.apoio, barra: "background: " + c.barra, barraOn: "background: " + c.barraOn,
    botao: "background: " + c.botao, botaoTx: "color: " + c.botaoTexto, img: c.imagem || "" };
}

function hojeSP() {
  var d = new Date(Date.now() - 3 * 3600000);
  return d.toISOString().slice(0, 10);
}

function linhas(lista, euId, aba, metrica, dados) {
  return (lista || []).map(function (r, i) {
    var eu = r.uid === euId;
    var dei = !!(r.deiTp || dados[r.uid]);
    var dias = r.dias + (r.dias === 1 ? " dia pago" : " dias pagos");
    var sub = aba === "hoje" ? (r.fez || "Ainda não treinou hoje")
      : metrica === "dias" ? r.pontos + " pts"
      : metrica === "pontos" ? dias
      : dias + " · " + r.pontos + " pts";
    return {
      uid: r.uid, pos: i + 1, lider: i === 0 && r.valor > 0, eu: eu,
      nomeTxt: eu ? "Você" : r.nome, sub: sub,
      valor: fmt(r.valor, metrica), un: metrica === "dias" ? (r.valor === 1 ? "dia pago" : "dias pagos") : UN[metrica],
      cor: tipos.corDe(r.uid), ini: tipos.iniciais(r.nome), avatar: r.avatar || "",
      foto: r.foto || "", dei: dei, verificado: !!r.verificado, trofeus: r.trofeus || 0, treinouHoje: !!r.treinouHoje, cutuquei: !!(r.cutuquei || dados["c" + r.uid]),
      icone: dei ? ic.CHECK_PRETO : ic.CHECK_CINZA,
    };
  });
}

Page({
  data: {
    logo: logo.LOGO_ESCURO, ic: ic, marcas: marcas, cutucarOn: !!getApp().globalData.cutucar, conteudoTop: 88,
    carregando: true, erro: "", saudacao: "", hojeTxt: "",
    aba: "total", expandido: false, listaVisivel: [], timeline: [], tlMais: false, tlCarregando: false, grupo: "", grupos: [], grupoAtual: null,
    lista: [], sozinho: false, semana: [],
    euCor: "#B08968", euIni: "", euAvatar: "", posN: "–", total: 1, euMin: 0, seqN: 0, treinosSemana: 0, fundo: "",
    toast: "",
  },

  onLoad: function (q) {
    compartilhar.ligarMenuDoPhiz();
    var m = view.barMetrics();
    this.dados = {};
    this.convite = q && q.convite ? String(q.convite) : "";
    var d = new Date();
    this.setData({ conteudoTop: m.conteudoTop, barTop: m.barTop, barH: m.barH, hojeTxt: SEMANA[d.getDay()] + ", " + d.getDate() + " " + MESES[d.getMonth()] });
    var salvo = null;
    try { salvo = pz.getStorageSync(CACHE) || null; } catch (e) {}
    if (salvo && salvo.eu) {
      this.painel = salvo;
      getApp().globalData.eu = salvo.eu;
      this.desenhar();
    } else {
      this.abertura();
    }
    this.iniciar();
    // Primeira vez: a entrada abre na hora, sem esperar o ranking carregar.
    var visto = "";
    try { visto = pz.getStorageSync("tp_comecar_visto") || ""; } catch (e) {}
    if (!visto) { this.abriuComecar = true; pz.navigateTo({ url: "/pages/comecar/comecar" }); }
  },

  abertura: function () {
    var self = this, l = frases(), i = 0;
    this.setData({ frase: l[0] });
    clearInterval(this.fi);
    this.fi = setInterval(function () { i = (i + 1) % l.length; self.setData({ frase: l[i] }); }, 1400);
  },

  onUnload: function () { clearInterval(this.fi); },

  // Header de vidro: liga quando a página sai do topo (só manda setData quando muda).
  onPageScroll: function (e) {
    var r = e.scrollTop > 6;
    if (r !== this.rolou) { this.rolou = r; this.setData({ rolou: r }); }
  },

  alternarMenu: function () { this.setData({ menu: !this.data.menu }); try { pz.vibrateShort({ type: "light" }); } catch (e) {} },
  fecharMenu: function () { this.setData({ menu: false }); },
  menuAtividade: function () { this.setData({ menu: false }); this.registrar(); },
  menuCodigo: function () { this.setData({ menu: false }); this.entrarComCodigo(); },
  avisoQuero: function () {
    var self = this;
    if (!this.data.avisoSheet || this.data.avisoSheet.ocupado) return;
    this.setData({ "avisoSheet.ocupado": true });
    api.api("POST", "/api/mini/eu", { avisos: true }).then(function (r) {
      self.setData({ avisoSheet: null });
      if (r.status === 200 && self.painel) self.painel.eu = r.data.usuario || self.painel.eu;
      self.mostrar(r.status === 200 ? "Pedido feito ✅ Em breve você recebe no chat" : "Não deu agora. Tenta pelos Ajustes.");
    }, function () { self.setData({ avisoSheet: null }); self.mostrar("Sem conexão."); });
  },
  avisoAgoraNao: function () {
    this.setData({ avisoSheet: null });
    api.api("POST", "/api/mini/eu", { avisosAgoraNao: true });
  },
  menuGrupo: function () { this.setData({ menu: false }); this.novoGrupo(); },
  menuMoments: function () { this.setData({ menu: false }); pz.navigateTo({ url: "/pages/moments/moments" }); },

  onShow: function () {
    var app = getApp();
    if (app.globalData.aviso) { this.mostrar(app.globalData.aviso); app.globalData.aviso = ""; }
    if (app.globalData.irParaGrupo) { var gid = app.globalData.irParaGrupo; app.globalData.irParaGrupo = ""; this.abrirGrupo(gid); }
    if (this.painel) this.carregar();
  },

  onPullDownRefresh: function () {
    this.carregar().then(function () { pz.stopPullDownRefresh(); }, function () { pz.stopPullDownRefresh(); });
  },

  iniciar: function () {
    var self = this;
    if (!self.painel) self.setData({ carregando: true, erro: "" });
    api.entrar().then(function () {
      return self.convite ? self.aceitarConvite(self.convite) : null;
    }).then(function () {
      return self.carregar();
    }).catch(function (e) {
      clearInterval(self.fi);
      if (self.painel) self.mostrar("Sem conexão. Mostrando o último ranking.");
      else self.setData({ carregando: false, erro: e.message || "Não deu pra entrar." });
    });
  },

  // Abriu pelo cartão do chat: entra no grupo e já mostra o ranking dele.
  aceitarConvite: function (codigo) {
    var self = this;
    this.convite = "";
    return api.api("POST", "/api/mini/grupos", { acao: "entrar", codigo: codigo }).then(function (r) {
      if (r.status === 200 && r.data.grupo) {
        self.abrirGrupo(r.data.grupo.id);
        self.mostrar(r.data.novo ? "Você entrou no " + r.data.grupo.nome + " 🔥" : "Você já está no " + r.data.grupo.nome);
      } else {
        self.mostrar(r.data.erro || "Convite não encontrado.");
      }
    });
  },

  carregar: function () {
    var self = this;
    var g = this.data.grupo;
    return api.api("GET", "/api/mini/painel?periodo=" + this.data.aba + (g ? "&grupo=" + g : "")).then(function (r) {
      if (r.status !== 200) throw new Error(r.data.erro || "Não deu pra carregar.");
      self.painel = r.data;
      getApp().globalData.tema = r.data.tema || null;
      getApp().globalData.eu = r.data.eu;
      if (!g) { try { var c = {}; for (var k in r.data) c[k] = r.data[k]; c.stravaNovo = null; c.vitoria = null; pz.setStorageSync(CACHE, c); } catch (e) {} }
      var visto = "";
      try { visto = pz.getStorageSync("tp_comecar_visto") || ""; } catch (e) {}
      if (!visto && !self.abriuComecar) { self.abriuComecar = true; pz.navigateTo({ url: "/pages/comecar/comecar" }); }
      self.desenhar();
    }).catch(function (e) {
      clearInterval(self.fi);
      if (self.data.rkTroca) self.setData({ rkTroca: false });
      if (self.painel) self.mostrar(e.message || "Sem conexão.");
      else self.setData({ carregando: false, erro: e.message });
    });
  },

  desenhar: function () {
    var p = this.painel;
    if (!p) return;
    var aba = this.data.aba, metrica = p.metrica || "pontos";
    var lista = linhas(p.ranking, p.eu.id, aba, metrica, this.dados);
    var meu = null;
    lista.forEach(function (l) { if (l.eu) meu = l; });
    var sd = p.semanaDias || [], hi = p.hojeIdx;
    var h = new Date().getHours();
    var oi = h < 5 ? "Boa noite" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    var primeiro = String(p.eu.nome || "").split(" ")[0];
    var grupoAtual = null;
    (p.grupos || []).forEach(function (g) { if (g.id === p.grupo) grupoAtual = g; });
    var hj = p.hojeEu || { pontos: 0, min: 0 };
    var periodoTxt = aba === "hoje" ? "hoje" : aba === "semana" ? "na semana" : aba === "mes" ? "no mês" : "de todos os tempos";
    clearInterval(this.fi);
    var rostosHoje = (p.treinaramHoje || []).filter(function (t) { return t.uid !== p.eu.id; });
    this.setData({
      chamada: hj.pontos > 0 ? null : chamadaDoDia(p, lista, meu, metrica, rostosHoje),
      carregando: false, erro: "",
      saudacao: oi, primeiro: primeiro && primeiro !== "Atleta" ? primeiro : "",
      titulo: hj.pontos > 0 ? "Tá pago hoje 🔥" : "",
      lista: lista, listaVisivel: visivel(lista, this.data.expandido), sozinho: lista.length <= 1,
      timeline: (p.timeline || []).map(itemTl), tlMais: (p.timeline || []).length >= 20,
      semana: DIAS.map(function (d, i) { return { d: d, ok: !!sd[i], hoje: i === hi }; }),
      grupos: p.grupos || [], grupo: p.grupo || "", grupoAtual: grupoAtual,
      grupoComo: grupoAtual ? COMO[grupoAtual.metrica] || "" : "",
      etiquetaDia: (grupoAtual ? grupoAtual.nome : "Ranking geral") + " · " + periodoTxt,
      foraDoGeral: !grupoAtual && p.eu.aparecer === false,
      euCor: tipos.corDe(p.eu.id), euIni: tipos.iniciais(p.eu.nome), euAvatar: p.eu.avatar || "",
      // Tema do dia (campanha): card, faixa no topo e enfeite nos avatares. Vem do servidor, sem atualizar o app.
      tema: p.tema || null, tm: estiloTema(p.tema), enf: (p.tema && p.tema.enfeite) || null,
      posN: meu && (meu.valor !== "0") ? String(meu.pos) : "–", total: Math.max(lista.length, 1),
      euValor: meu ? meu.valor + " " + meu.un : "0 " + UN[metrica],
      rostos: (p.treinaramHoje || []).map(function (t) {
        return { uid: t.uid, nome: String(t.nome || "").split(" ")[0], avatar: t.avatar || "", cor: tipos.corDe(t.uid), ini: tipos.iniciais(t.nome || "?"), tipo: t.tipo, foto: t.foto || "" };
      }),
      euTreinou: hj.pontos > 0,
      convite: (p.convites || [])[0] || null,
      ptsHoje: hj.pontos || 0, minHoje: hj.min || 0, ptsSemana: p.pontosSemana || 0, treinosSemana: p.treinosSemana || 0,
      seqN: p.seq || 0, fundo: p.ultimaFoto || "", euVerificado: !!p.euVerificado,
      cutucou: (p.cutucadoPor || []).length && !(hj.pontos > 0) ? juntar(p.cutucadoPor) : "",
    });
    this.soltarRanking();
    // Chegou treino do Strava que a pessoa ainda não viu: abre a folha uma vez.
    var sn = p.stravaNovo;
    // Cartão na home fica até a pessoa resolver (mesmo se fechar a folha).
    this.setData({ stCard: sn ? { titulo: sn.titulo, pendente: sn.pendenteFoto, linha: sn.min + " min" + (sn.km ? " · " + String(sn.km).replace(".", ",") + " km" : "") } : null });
    // Campeão da semana: a comemoração vem antes de tudo (e a folha do Strava espera).
    var v = p.vitoria;
    if (v && this.vitFechada !== v.id && !this.data.vit) { this.comemorar(v); return; }
    // Subiu de nível (ou os níveis acabaram de chegar): depois do campeão, antes do Strava.
    var sv = p.subiuNivel;
    if (sv && !this.data.vit && !this.data.nv && this.nvFechado !== sv.para) { this.comemorarNivel(sv, p.nivel); return; }
    // Conquista nova (badge): depois do nível.
    var cqN = p.conquistaNova;
    if (cqN && !this.data.vit && !this.data.nv && !this.data.cq && this.cqFechada !== cqN.id) { this.comemorarConquista(cqN); return; }
    if (sn && !this.data.vit && this.stFechado !== sn.id && (!this.data.st || this.data.st.id !== sn.id)) { this.abrirStrava(sn); return; }
    // Avisos no chat: só depois da tela de entrada e sem outra folha aberta.
    var eu = p.eu, visto = "";
    try { visto = pz.getStorageSync("tp_comecar_visto") || ""; } catch (e) {}
    var perguntou = eu.avisosPerguntaEm ? Date.now() - Date.parse(eu.avisosPerguntaEm) < 14 * 86400000 : false;
    if (visto && !this.avisoVisto && !this.data.st && !this.data.vit && !eu.temTelefone && !eu.querAvisos && eu.avisos !== false && !perguntou) {
      this.avisoVisto = true;
      this.setData({ avisoSheet: { ocupado: false } });
    }
  },

  alternarRanking: function () {
    var ex = !this.data.expandido;
    this.setData({ expandido: ex, listaVisivel: visivel(this.data.lista, ex) });
  },

  maisTimeline: function () {
    var self = this, tl = this.data.timeline;
    if (this.data.tlCarregando || !tl.length) return;
    this.setData({ tlCarregando: true });
    api.api("GET", "/api/mini/timeline?antes=" + encodeURIComponent(tl[tl.length - 1].criadoEm)).then(function (r) {
      var novos = (r.data.itens || []).map(itemTl);
      self.setData({ tlCarregando: false, timeline: tl.concat(novos), tlMais: novos.length >= 20 });
    }, function () { self.setData({ tlCarregando: false }); });
  },

  tpTimeline: function (e) {
    var i = Number(e.currentTarget.dataset.i), t = this.data.timeline[i], self = this;
    if (!t || t.dei || !t.podeTp) return;
    var o = {}; o["timeline[" + i + "].dei"] = true; o["timeline[" + i + "].tp"] = t.tp + 1;
    this.setData(o);
    try { pz.vibrateShort({ type: "light" }); } catch (err) {}
    api.api("POST", "/api/mini/tapago", { para: t.uid }).then(function (r) {
      if (r.status !== 200) { var v = {}; v["timeline[" + i + "].dei"] = false; v["timeline[" + i + "].tp"] = t.tp; self.setData(v); }
    });
  },

  trocarAba: function (e) {
    var aba = e.currentTarget.dataset.aba;
    if (aba === this.data.aba) return;
    this.trocarRanking({ aba: aba });
  },

  // Troca de ranking com motion: a lista sai na hora (dá pra ver que mudou) e entra de novo linha a linha.
  trocarRanking: function (muda) {
    muda.rkTroca = true; muda.rkAnim = false;
    this.rkDesde = Date.now();
    this.setData(muda);
    this.carregar();
  },
  // Chamado depois de desenhar: segura a saída um instante e solta a entrada.
  soltarRanking: function () {
    if (!this.data.rkTroca) return;
    var self = this, espera = Math.max(0, 180 - (Date.now() - (this.rkDesde || 0)));
    setTimeout(function () { self.setData({ rkTroca: false, rkAnim: true }); }, espera);
  },

  // Geral fica na home; grupo abre a página dele (ranking do grupo é o centro).
  abrirGrupo: function (id) { pz.navigateTo({ url: "/pages/clube/clube?id=" + id }); },

  trocarGrupo: function (e) {
    var id = e.currentTarget.dataset.id || "";
    if (id) return this.abrirGrupo(id);
    if (id === this.data.grupo) return;
    this.trocarRanking({ grupo: id });
  },

  novoGrupo: function () { pz.navigateTo({ url: "/pages/grupo/grupo" }); },
  entrarComCodigo: function () { pz.navigateTo({ url: "/pages/grupo/grupo?entrar=1" }); },

  copiarConvite: function () {
    var g = this.data.grupoAtual;
    if (!g) return;
    var eu = String((getApp().globalData.eu || {}).nome || "").split(" ")[0];
    var txt = (eu ? eu + " te chamou pro " : "Bora pro ") + g.nome + " no Tá Pago! 💪\n\nAbre o miniapp Tá Pago! no PhizChat, toca em \"Tenho um código\" e digita: " + g.codigo;
    pz.setClipboardData({ data: txt, success: function () { pz.showToast({ title: "Convite copiado", icon: "none" }); } });
  },

  // Encaminhar o miniapp pro chat (botão open-type="share" e menu ⋯).
  onShareTimeline: function () {
    var vit = this.data.vit;
    if (vit) return { title: "Ganhei a semana no " + vit.titulo + " 🏆", imageUrl: vit.arte };
    return { title: "Treinou, tá pago! Bora treinar junto? 💪" };
  },

  onShareAppMessage: function (res) {
    var vit = this.data.vit;
    if (vit && res && res.from === "button" && res.target && res.target.dataset && res.target.dataset.vit) {
      return { title: "Ganhei a semana no " + vit.titulo + " 🏆 Vem me tirar do topo!", path: "/pages/index/index", imageUrl: vit.arte || vit.podio };
    }
    var g = this.data.grupoAtual;
    var eu = (getApp().globalData.eu || {}).nome || "";
    var primeiro = String(eu).split(" ")[0];
    if (g) {
      return {
        title: "Vem pro " + g.nome + " 💪",
        path: "/pages/index/index?convite=" + g.codigo,
        // Imagem gerada por grupo: "Vem pro <grupo>" (servidor, /api/convite).
        imageUrl: "https://phizchat-tapago.vercel.app/api/convite/" + g.codigo + ".png",
      };
    }
    return { title: "Treinou, tá pago! Bora treinar junto? 💪", path: "/pages/index/index", imageUrl: "https://phizchat-tapago.vercel.app/marca/convite.png" };
  },

  darTp: function (e) {
    var uid = e.currentTarget.dataset.uid;
    var self = this;
    var linha = null;
    this.data.lista.forEach(function (l) { if (l.uid === uid) linha = l; });
    if (!linha || linha.eu || linha.dei) return;
    this.dados[uid] = true;
    this.desenhar();
    this.mostrar("Você deu tá pago pra " + linha.nomeTxt.split(" ")[0]);
    try { pz.vibrateShort({ type: "light" }); } catch (err) {}
    api.api("POST", "/api/mini/tapago", { para: uid }).then(function (r) {
      if (r.status !== 200) { delete self.dados[uid]; self.desenhar(); self.mostrar("Não deu certo. Tenta de novo."); }
    }, function () { delete self.dados[uid]; self.desenhar(); self.mostrar("Sem conexão."); });
  },


  irRanking: function () { pz.pageScrollTo({ selector: "#ranking", duration: 300 }); },

  /* ── Campeão da semana ─────────────────────────────────────────── */
  comemorar: function (v) {
    var self = this, cores = ["#C6F432", "#FFFFFF", "#A78BFA", "#C6F432"], conf = [];
    for (var i = 0; i < 60; i++) {
      conf.push({ x: Math.round(Math.random() * 100), w: 10 + Math.round(Math.random() * 14), cor: cores[i % 4],
        d: (Math.random() * 1.2).toFixed(2), t: (2.4 + Math.random() * 1.8).toFixed(2), r: Math.round(Math.random() * 360) });
    }
    this.setData({
      vit: { id: v.id, titulo: v.titulo, valor: v.valor, un: v.un, membros: v.membros, podio: v.podio, arte: v.arte, n: 0, etapa: 1, rotulo: ((getApp().globalData.eu || {}).genero === 2 ? "Campeã" : "Campeão") + " da semana", ocupado: "", postado: false,
        frase: v.total === 1 ? "Seu primeiro troféu!" : "troféus vencidos",
        valorTxt: v.valor + " " + (v.un === "dias" || v.un === "dia" ? (v.valor === 1 ? "dia pago" : "dias pagos") : v.un),
        aqui: v.naqui > 1 ? v.naqui + "× campeão aqui" : "" },
      conf: conf,
    });
    try { pz.vibrateLong(); } catch (e) {}
    // Contador sobe até o total de semanas vencidas.
    var n = 0;
    clearInterval(this.vi);
    this.vi = setInterval(function () {
      n++; self.setData({ "vit.n": n });
      if (n >= v.total) clearInterval(self.vi);
    }, Math.max(80, Math.round(900 / Math.max(v.total, 1))));
  },
  verArteCampeao: function () { this.setData({ "vit.etapa": 2 }); },
  voltarVitoria: function () { if (this.data.vit && this.data.vit.etapa === 2) this.setData({ "vit.etapa": 1 }); else this.fecharVitoria(); },
  postarCampeao: function () {
    var self = this, v = this.data.vit;
    if (!v || v.ocupado) return;
    this.setData({ "vit.ocupado": "post" });
    compartilhar.postarNoMeuMoments(v.arte).then(function (r) {
      self.setData({ "vit.ocupado": "" });
      self.mostrar(r === "menu" ? "Escolha Moments pra postar 🏆" : r === "salvo" ? "Imagem salva! Agora é só postar no seu Moments 🏆" : "Segure a imagem pra salvar e postar 🏆");
    });
  },
  postarCampeaoPelaConta: function () {
    var self = this, v = this.data.vit;
    if (!v || v.ocupado || v.postado) return;
    this.setData({ "vit.ocupado": "post" });
    api.api("POST", "/api/mini/publicar", { vitoriaId: v.id }).then(function (r) {
      var ok = r.status === 200 && r.data.momento === "publicado";
      self.setData({ "vit.ocupado": "", "vit.postado": ok });
      self.mostrar(ok ? "Postado nos Momentos! 🏆" : "O post nos Momentos ainda não está liberado. Salva a imagem e posta você 😉");
    }, function () { self.setData({ "vit.ocupado": "" }); self.mostrar("Sem conexão."); });
  },
  // Salvar no celular: baixa e grava no álbum; se não der (permissão/domínio), abre a imagem pra segurar e salvar.
  salvarCampeao: function () {
    var self = this, v = this.data.vit;
    if (!v || v.ocupado) return;
    var abrir = function () { pz.previewImage({ urls: [v.arte], current: v.arte }); };
    this.setData({ "vit.ocupado": "salvar" });
    pz.downloadFile({
      url: v.arte,
      success: function (r) {
        if (r.statusCode !== 200) { self.setData({ "vit.ocupado": "" }); return abrir(); }
        pz.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: function () { self.setData({ "vit.ocupado": "" }); self.mostrar("Salvo no seu celular 📸"); },
          fail: function () { self.setData({ "vit.ocupado": "" }); abrir(); },
        });
      },
      fail: function () { self.setData({ "vit.ocupado": "" }); abrir(); },
    });
  },
  fecharVitoria: function () {
    var v = this.data.vit;
    if (!v) return;
    this.vitFechada = v.id;
    clearInterval(this.vi);
    this.setData({ vit: null, conf: [] });
    api.api("POST", "/api/mini/eu", { vitoriaVista: v.id });
    var sn = this.painel && this.painel.stravaNovo;
    if (sn && this.stFechado !== sn.id) this.abrirStrava(sn);
  },

  /* ── Subiu de nível ───────────────────────────────────────────────── */
  comemorarNivel: function (sv, nivel) {
    var self = this, f = sv.faixa;
    var nova = sv.revelacao || sv.faixaNova;
    // Incentivo: quanto mais treino, mais níveis e mais benefícios.
    var mais = "Quanto mais você treina, mais níveis sobe e mais benefícios destrava.";
    var texto = sv.revelacao
      ? (sv.para <= 1 ? "Você está começando no Tá Pago! " + mais : "Seus treinos já te trouxeram até aqui. " + mais)
      : sv.faixaNova ? sv.frase + " Continue treinando: os próximos benefícios estão logo ali."
      : (nivel && nivel.falta ? "Faltam " + nivel.falta + " pontos pro nível " + (sv.para + 1) + ". Cada treino te deixa mais perto do próximo benefício." : "Mais um nível no Tá Pago! " + mais);
    var po = poeira(), estrelas = ESTRELAS;
    var ac = nivelU.acento(f);
    var canhoes = canhoesDe(ac);
    // Selo da faixa vem do servidor: carrega antes de abrir, pra ele não cair vazio.
    var selo = nivelU.selo(f.id);
    if (this.seloPronto !== selo) {
      if (this.seloCarregando === selo) return;
      this.seloCarregando = selo;
      var abriu = false, abrir = function () { if (abriu) return; abriu = true; self.seloCarregando = ""; self.seloPronto = selo; self.comemorarNivel(sv, nivel); };
      pz.getImageInfo({ src: selo, success: abrir, fail: abrir });
      setTimeout(abrir, 2500);
      return;
    }
    this.limparNivel();
    this.setData({
      conf: [],
      nv: { para: sv.para, de: sv.de, po: po, estrelas: estrelas, canhoes: canhoes, on: false, etapa: 1, ac: ac,
        selo: selo, numPara: nivelU.numero(sv.para, f.id, 108), numDe: nivelU.numero(sv.de, f.id, 108), faixa: f, nova: nova, arte: sv.arte, ocupado: "",
        topo: sv.revelacao ? "Você chegou no nível " + sv.para : "Novo nível",
        titulo: nova ? f.nome : "Nível " + sv.para, texto: texto,
        recompensas: (sv.recompensas || []).slice(0, 3).map(function (r) { return { nome: r.nome }; }) },
    });
    try { pz.vibrateShort({ type: "light" }); } catch (e) {}
    // O selo pousa no pódio em ~2 s: estalo, brilho, vibração e o texto entra.
    this.nt = [
      setTimeout(function () {
        if (!self.data.nv) return;
        self.setData({ "nv.on": true });
        try { pz.vibrateLong(); } catch (e) {}
      }, 2000),
    ];
  },
  limparNivel: function () { (this.nt || []).forEach(clearTimeout); this.nt = []; },
  verArteNivel: function () { this.setData({ "nv.etapa": 2 }); },
  // Voltar: na arte volta pra festa; na festa fecha.
  voltarNivel: function () { if (this.data.nv && this.data.nv.etapa === 2) this.setData({ "nv.etapa": 1 }); else this.fecharNivel(); },
  postarNivel: function () {
    var self = this, v = this.data.nv;
    if (!v || v.ocupado) return;
    this.setData({ "nv.ocupado": "post" });
    compartilhar.postarNoMeuMoments(v.arte).then(function (r) {
      self.setData({ "nv.ocupado": "" });
      self.mostrar(r === "menu" ? "Escolha Moments pra postar 🚀" : r === "salvo" ? "Imagem salva! Agora é só postar no seu Moments 🚀" : "Segure a imagem pra salvar e postar 🚀");
    });
  },
  salvarNivel: function () {
    var self = this, v = this.data.nv;
    if (!v || v.ocupado) return;
    var abrir = function () { pz.previewImage({ urls: [v.arte], current: v.arte }); };
    this.setData({ "nv.ocupado": "salvar" });
    pz.downloadFile({
      url: v.arte,
      success: function (r) {
        if (r.statusCode !== 200) { self.setData({ "nv.ocupado": "" }); return abrir(); }
        pz.saveImageToPhotosAlbum({
          filePath: r.tempFilePath,
          success: function () { self.setData({ "nv.ocupado": "" }); self.mostrar("Salvo no seu celular 📸"); },
          fail: function () { self.setData({ "nv.ocupado": "" }); abrir(); },
        });
      },
      fail: function () { self.setData({ "nv.ocupado": "" }); abrir(); },
    });
  },
  fecharNivel: function () {
    var v = this.data.nv;
    if (!v) return;
    this.nvFechado = v.para;
    this.limparNivel();
    this.setData({ nv: null, conf: [] });
    api.api("POST", "/api/mini/eu", { nivelVisto: v.para });
    var sn = this.painel && this.painel.stravaNovo;
    if (sn && this.stFechado !== sn.id) this.abrirStrava(sn);
  },

  /* ── Ganhou uma conquista (badge) ─────────────────────────────────── */
  comemorarConquista: function (c) {
    var self = this;
    // Imagem do badge vem do servidor: carrega antes, pra não cair vazio.
    if (this.cqPronta !== c.imagem) {
      if (this.cqCarregando === c.imagem) return;
      this.cqCarregando = c.imagem;
      var abriu = false, abrir = function () { if (abriu) return; abriu = true; self.cqCarregando = ""; self.cqPronta = c.imagem; self.comemorarConquista(c); };
      pz.getImageInfo({ src: c.imagem, success: abrir, fail: abrir });
      setTimeout(abrir, 2500);
      return;
    }
    this.limparNivel();
    var ac = c.cor || "#C6F432";
    this.setData({
      cq: { id: c.id, nome: c.nome, topo: c.edicao || "Nova conquista", texto: (c.descricao ? c.descricao + " " : "") + "Ela fica no seu perfil pra sempre.",
        imagem: c.imagem, arte: c.arte, ac: ac, po: poeira(), estrelas: ESTRELAS, canhoes: canhoesDe(ac), on: false, etapa: 1, ocupado: "" },
    });
    try { pz.vibrateShort({ type: "light" }); } catch (e) {}
    this.nt = [setTimeout(function () { if (!self.data.cq) return; self.setData({ "cq.on": true }); try { pz.vibrateLong(); } catch (e) {} }, 2000)];
  },
  verArteConquista: function () { this.setData({ "cq.etapa": 2 }); },
  voltarConquista: function () { if (this.data.cq && this.data.cq.etapa === 2) this.setData({ "cq.etapa": 1 }); else this.fecharConquista(); },
  postarConquista: function () {
    var self = this, v = this.data.cq;
    if (!v || v.ocupado) return;
    this.setData({ "cq.ocupado": "post" });
    compartilhar.postarNoMeuMoments(v.arte).then(function (r) {
      self.setData({ "cq.ocupado": "" });
      self.mostrar(r === "menu" ? "Escolha Moments pra postar 🚀" : r === "salvo" ? "Imagem salva! Agora é só postar no seu Moments 🚀" : "Segure a imagem pra salvar e postar 🚀");
    });
  },
  salvarConquista: function () {
    var self = this, v = this.data.cq;
    if (!v || v.ocupado) return;
    var abrir = function () { self.setData({ "cq.ocupado": "" }); pz.previewImage({ urls: [v.arte], current: v.arte }); };
    this.setData({ "cq.ocupado": "salvar" });
    pz.downloadFile({
      url: v.arte,
      success: function (r) {
        if (r.statusCode !== 200) return abrir();
        pz.saveImageToPhotosAlbum({ filePath: r.tempFilePath, success: function () { self.setData({ "cq.ocupado": "" }); self.mostrar("Salvo no seu celular 📸"); }, fail: abrir });
      },
      fail: abrir,
    });
  },
  fecharConquista: function () {
    var v = this.data.cq;
    if (!v) return;
    this.cqFechada = v.id;
    this.limparNivel();
    this.setData({ cq: null });
    var self = this;
    // Marca como vista e recarrega: se tiver outra conquista esperando, ela aparece em seguida.
    api.api("POST", "/api/mini/eu", { conquistaVista: v.id }).then(function () { self.carregar(); });
  },
  // Faixa do tema: abre o meu perfil, onde fica a conquista da campanha.
  abrirFaixa: function () { pz.navigateTo({ url: "/pages/eu/eu" }); },

  /* ── Folha "Chegou do Strava" ─────────────────────────────────────── */
  abrirStrava: function (sn) {
    var km = sn.km ? " · " + String(sn.km).replace(".", ",") + " km" : "";
    this.setData({
      st: {
        id: sn.id, titulo: sn.titulo, arte: sn.arte, pendente: sn.pendenteFoto, temFoto: sn.temFoto, noStrava: sn.noStrava || "", visivel: sn.visivel || null, editando: false, quem: [],
        linha: sn.min + " min" + km + (sn.pendenteFoto ? "" : " · +" + sn.pontos + " pts hoje"),
        ocupado: "", aviso: "",
      },
    });
  },
  // "Agora não": fecha a folha. Treino que vale ponto some do cartão; o que espera foto continua lá.
  // Editar o treino do Strava: título e quem pode ver (o treino já está salvo; isso é opcional).
  editarStrava: function () {
    var self = this, st = this.data.st;
    this.tituloNovo = st.titulo;
    vis.carregarGrupos().then(function (gs) { self.setData({ "st.editando": true, "st.quem": vis.opcoes(gs, st.visivel) }); });
  },
  tituloStrava: function (e) { this.tituloNovo = e.detail.value; },
  quemStrava: function (e) {
    var i = Number(e.currentTarget.dataset.i), o = {};
    o["st.quem[" + i + "].on"] = !this.data.st.quem[i].on;
    this.setData(o);
  },
  cancelarEdicaoStrava: function () { this.setData({ "st.editando": false }); },
  salvarEdicaoStrava: function () {
    var self = this, st = this.data.st;
    this.setData({ "st.ocupado": "editar" });
    api.api("POST", "/api/mini/treinos/editar", { id: st.id, titulo: this.tituloNovo, visivel: vis.paraEnviar(st.quem) }).then(function (r) {
      if (r.status !== 200) { self.setData({ "st.ocupado": "", "st.aviso": r.data.erro || "Não deu pra salvar." }); return; }
      self.setData({ "st.ocupado": "", "st.editando": false, "st.titulo": r.data.titulo || st.titulo, "st.visivel": r.data.visivel });
      self.mostrar("Treino atualizado ✅");
    }, function () { self.setData({ "st.ocupado": "", "st.aviso": "Sem conexão." }); });
  },

  verNoStrava: function (e) { stravaU.verNoStrava(e.currentTarget.dataset.url); },
  fecharStrava: function () {
    var st = this.data.st;
    if (!st) return;
    this.stFechado = st.id;
    this.setData({ st: null });
    if (!st.pendente) { this.setData({ stCard: null }); api.api("POST", "/api/mini/strava", { acao: "visto", id: st.id }); }
  },
  reabrirStrava: function () {
    var sn = this.painel && this.painel.stravaNovo;
    if (sn) this.abrirStrava(sn);
  },
  fotoStrava: function () {
    var self = this, st = this.data.st;
    if (!st || st.ocupado) return;
    camera.tirar(function (caminho) {
      self.setData({ "st.ocupado": "foto", "st.aviso": "" });
      api.enviarFoto("/api/mini/treinos/foto", caminho, { treinoId: st.id }).then(function (r) {
        if (r.status === 422) { self.setData({ "st.ocupado": "", "st.aviso": (r.data.titulo ? r.data.titulo + ". " : "") + (r.data.erro || "Essa foto não parece de treino.") }); return; }
        if (r.status !== 200) { self.setData({ "st.ocupado": "", "st.aviso": r.data.erro || "Não deu pra salvar a foto." }); return; }
        var sep = st.arte.indexOf("?") >= 0 ? "&" : "?";
        self.setData({ "st.ocupado": "", "st.temFoto": true, "st.pendente": false, "st.arte": st.arte + sep + "v=" + Date.now() });
        self.mostrar(r.data.valeu ? "Foto conferida, agora vale ponto! 🔥" : "Foto adicionada");
        self.carregar();
      }, function () { self.setData({ "st.ocupado": "", "st.aviso": "Sem conexão." }); });
    });
  },
  postarStrava: function () {
    var self = this, st = this.data.st;
    if (!st || st.ocupado || st.pendente) return;
    this.setData({ "st.ocupado": "post" });
    compartilhar.postarNoMeuMoments(st.arte).then(function (r) {
      self.stFechado = st.id;
      self.setData({ st: null, stCard: null });
      api.api("POST", "/api/mini/strava", { acao: "visto", id: st.id });
      self.mostrar(r === "menu" ? "Escolha Moments pra postar 📸" : r === "salvo" ? "Imagem salva! Agora é só postar no seu Moments 📸" : "Segure a imagem pra salvar e postar 📸");
    });
  },
  postarStravaPelaConta: function () {
    var self = this, st = this.data.st;
    if (!st || st.ocupado || st.pendente) return;
    this.setData({ "st.ocupado": "post" });
    api.api("POST", "/api/mini/publicar", { treinoId: st.id, momentos: true, clipes: false }).then(function (r) {
      var ok = r.status === 200 && r.data.momento === "publicado";
      self.stFechado = st.id;
      self.setData({ st: null, stCard: null });
      self.mostrar(ok ? "Postado nos Momentos!" : "Seu treino já está no ranking. O post nos Momentos chega em breve.");
    }, function () { self.setData({ "st.ocupado": "" }); self.mostrar("Sem conexão."); });
  },

  nada: function () {},
  // Fileira de rostos: toca e vê a foto do treino da pessoa.
  // Foto de treino não abre em tela cheia (sem zoom): tocar no rosto abre o perfil da pessoa.
  verRosto: function (e) {
    var r = this.data.rostos[e.currentTarget.dataset.i];
    if (r && r.uid) pz.navigateTo({ url: "/pages/eu/eu?uid=" + r.uid });
  },
  rostoEu: function () { if (this.data.euTreinou) this.abrirEu(); else this.registrar(); },

  responderConvite: function (e) {
    var self = this, c = this.data.convite, aceitar = e.currentTarget.dataset.sim === "1";
    if (!c) return;
    this.setData({ convite: null });
    api.api("POST", "/api/mini/grupos", { acao: "responder", id: c.id, aceitar: aceitar }).then(function (r) {
      if (r.status !== 200) { self.mostrar(r.data.erro || "Não deu certo."); return; }
      if (aceitar) { self.mostrar("Você entrou no " + c.grupo + " 🔥"); self.carregar(); self.abrirGrupo(c.grupoId); }
    });
  },

  abrirEu: function () { pz.navigateTo({ url: "/pages/eu/eu" }); },
  tocarLinha: function (e) {
    var d = e.currentTarget.dataset;
    if (d.eu) this.abrirEu();
    else if (d.uid) pz.navigateTo({ url: "/pages/eu/eu?uid=" + d.uid });
  },

  registrar: function () { pz.navigateTo({ url: "/pages/registrar/registrar" }); },
  abrirAjustes: function () { pz.navigateTo({ url: "/pages/ajustes/ajustes" }); },

  mostrar: function (txt) {
    var self = this;
    clearTimeout(this.tt);
    this.setData({ toast: txt });
    this.tt = setTimeout(function () { self.setData({ toast: "" }); }, 2400);
  },

  tentarDeNovo: function () { this.iniciar(); },
});
