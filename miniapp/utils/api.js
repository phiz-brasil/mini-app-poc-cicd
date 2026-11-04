// ---------------------------------------------------------------------------
// A ponte com o servidor do Tá Pago! (phizchat-tapago.vercel.app).
//
// Quem é a pessoa: NUNCA perguntamos. pz.login (plugin de login do PhizChat,
// declarado no app.json) devolve um `code` de vida curta; o NOSSO servidor
// troca esse code no servidor da PhizClip e devolve um token assinado, que
// fica em pz.setStorageSync e vai em toda chamada. O miniapp nunca diz quem é.
//
// Enquanto o servidor da PhizClip não está configurado (ou na PhizClip
// Studio, onde o login pode não devolver code), o servidor aceita um "modo
// teste" com um id aleatório do aparelho — só se MINI_DEV_LOGIN=1 lá.
//
// O domínio precisa estar na allowlist do console do miniapp. Na IDE funciona
// sem cadastrar; no app de verdade, não.
// ---------------------------------------------------------------------------

var BASE = "https://phizchat-tapago.vercel.app";
var K_TOKEN = "tp_token";
var K_DEV = "tp_dev_id";

function devId() {
  var id = "";
  try { id = pz.getStorageSync(K_DEV) || ""; } catch (e) {}
  if (!id) {
    var h = "0123456789abcdef";
    for (var i = 0; i < 24; i++) id += h[Math.floor(Math.random() * 16)];
    try { pz.setStorageSync(K_DEV, id); } catch (e) {}
  }
  return id;
}

// Segredo que nasce e fica só neste aparelho: amarra a conta ao celular (o servidor guarda só o HMAC).
var K_SEG = "tp_seg";
function segredo() {
  var s = "";
  try { s = pz.getStorageSync(K_SEG) || ""; } catch (e) {}
  if (!s) {
    var h = "0123456789abcdef";
    for (var i = 0; i < 64; i++) s += h[Math.floor(Math.random() * 16)];
    try { pz.setStorageSync(K_SEG, s); } catch (e) {}
  }
  return s;
}

function token() { try { return pz.getStorageSync(K_TOKEN) || ""; } catch (e) { return ""; } }
function guardar(t) { try { pz.setStorageSync(K_TOKEN, t); } catch (e) {} }
function esquecer() { try { pz.removeStorageSync(K_TOKEN); pz.removeStorageSync("tp_painel_v1"); } catch (e) {} }

function chamada(metodo, caminho, dados, comToken) {
  return new Promise(function (ok, falha) {
    var h = { "content-type": "application/json" };
    if (comToken) h.authorization = "Bearer " + token();
    pz.request({
      url: BASE + caminho,
      method: metodo,
      data: dados || {},
      header: h,
      timeout: 20000,
      success: function (r) { ok({ status: r.statusCode, data: r.data || {} }); },
      fail: function (e) { falha(new Error((e && e.errMsg) || "Sem conexão.")); },
    });
  });
}

/**
 * Tudo o que dá pra saber da pessoa SEM PERGUNTAR NADA. Nada aqui abre
 * janela de permissão: o que o PhizChat não entregar em silêncio, fica sem.
 *   · idioma do aparelho (getSystemInfoSync)
 *   · nome e foto, se o plugin de login ou o getUserInfo devolverem
 * É só pra exibir. Quem diz QUEM a pessoa é continua sendo o code do login.
 */
// Nomes de campo possíveis (o PhizChat adaptou a API e não sabemos qual usa).
var CAMPOS_NOME = ["nickName", "nickname", "nick", "displayName", "userName", "username", "name", "realName", "fullName", "phizName"];
var CAMPOS_FOTO = ["avatarUrl", "avatar", "avatarURL", "headImg", "headImgUrl", "photo", "picture"];
var VISTO = {}; // fonte → nomes dos campos que vieram (diagnóstico, sem valores)

// Que funções o PhizChat expõe no pz.* (só os NOMES). Serve pra descobrir se existe
// algo como "compartilhar no Moments" registrado pelo app (API customizada do FinClip).
function apisDoPhiz() {
  var nomes = {};
  try { Object.keys(pz).forEach(function (k) { nomes[k] = 1; }); } catch (e) {}
  try { for (var k in pz) nomes[k] = 1; } catch (e) {}
  try { Object.getOwnPropertyNames(Object.getPrototypeOf(pz) || {}).forEach(function (k) { nomes[k] = 1; }); } catch (e) {}
  var lista = Object.keys(nomes).filter(function (k) { try { return typeof pz[k] === "function"; } catch (e) { return false; } });
  var podeUsar = {};
  ["showShareImageMenu", "showShareMenu", "shareAppMessage", "shareTimeline", "onShareTimeline", "shareToMoments", "shareToTimeline", "shareImage", "openMoments", "postMoment"].forEach(function (k) {
    var ok = false;
    try { ok = !!(pz.canIUse && pz.canIUse(k)); } catch (e) {}
    podeUsar[k] = (typeof pz[k] === "function" ? "fn" : "-") + (ok ? "/canIUse" : "");
  });
  // 1.0: sem a lista inteira (já lida em 21/10); fica só o que interessa pra compartilhar.
  return { total: lista.length, compartilhar: lista.filter(function (k) { return /share|moment|timeline|post|feed|social|forward/i.test(k); }), podeUsar: podeUsar };
}

function juntarPerfil(p, u, fonte) {
  if (!u || typeof u !== "object") return p;
  if (fonte) VISTO[fonte] = Object.keys(u).slice(0, 30);
  CAMPOS_NOME.forEach(function (k) { if (!p.nome && typeof u[k] === "string" && u[k].trim()) p.nome = u[k].trim(); });
  CAMPOS_FOTO.forEach(function (k) { if (!p.avatar && typeof u[k] === "string" && /^https?:/.test(u[k])) p.avatar = u[k]; });
  // O que o getUserInfo do PhizChat devolve além de nome e foto (confirmado no diagnóstico de 20/10).
  if (!p.phizId && u.userId) p.phizId = String(u.userId);
  if (!p.usuario && typeof u.username === "string") p.usuario = u.username;
  if (!p.cidade && typeof u.city === "string") p.cidade = u.city;
  if (p.genero == null && u.gender != null) p.genero = Number(u.gender);
  // Selo verificado: o getUserInfo ainda não manda; se um dia mandar, qualquer um destes campos vale.
  ["verified", "isVerified", "verify", "kyc", "kycStatus", "realNameAuth", "authStatus"].forEach(function (k) {
    var v = u[k]; if (v === true || v === 1 || v === "1" || v === "verified" || v === "PASS") p.verificado = true;
  });
  if (u.userInfo && typeof u.userInfo === "object" && u.userInfo !== u) juntarPerfil(p, u.userInfo, fonte ? fonte + ".userInfo" : "");
  return p;
}

function perfilSilencioso(doLogin) {
  return new Promise(function (ok) {
    var p = {};
    var fim = false;
    var acabar = function () { if (!fim) { fim = true; ok(p); } };
    try { p.idioma = pz.getSystemInfoSync().language || ""; } catch (e) {}
    juntarPerfil(p, doLogin, "login");
    if (p.nome) return acabar();
    // getUserInfo e, se não vier nome, getUserProfile — os dois são "adaptados"
    // pelo app hospedeiro (o PhizChat). Se ele não entregar, segue sem.
    var perfilPhiz = function () {
      try {
        if (!pz.getUserProfile) return acabar();
        pz.getUserProfile({
          desc: "Mostrar seu nome e sua foto no ranking", lang: "pt_BR",
          success: function (r) { juntarPerfil(p, r, "getUserProfile"); acabar(); },
          fail: function (e) { VISTO.getUserProfile_falhou = String((e && e.errMsg) || "").slice(0, 80); acabar(); },
        });
      } catch (e) { acabar(); }
    };
    try {
      if (!pz.getUserInfo) return perfilPhiz();
      pz.getUserInfo({
        lang: "pt_BR",
        success: function (r) { juntarPerfil(p, r, "getUserInfo"); p.nome ? acabar() : perfilPhiz(); },
        fail: function (e) { VISTO.getUserInfo_falhou = String((e && e.errMsg) || "").slice(0, 80); perfilPhiz(); },
      });
    } catch (e) { perfilPhiz(); }
    setTimeout(acabar, 2500);
  });
}

/** Entra direto com a conta do PhizChat. Resolve com { usuario, novo }. */
function entrar() {
  return new Promise(function (ok, falha) {
    var pedir = function (code, doLogin) {
      perfilSilencioso(doLogin).then(function (perfil) {
        // `apiserver` vai só como diagnóstico (descobrir o servidor da PhizClip);
        // o servidor NUNCA usa esse valor pra trocar o code.
        VISTO.apis = apisDoPhiz();
        var diag = { apiserver: (doLogin && doLogin.apiserver) || "", temCode: !!code, campos: VISTO };
        chamada("POST", "/api/mini/auth", { code: code || "", devId: devId(), segredo: segredo(), perfil: perfil, diag: diag }, false).then(function (r) {
          if (r.status === 200 && r.data.token) {
            guardar(r.data.token);
            ok({ usuario: r.data.usuario, novo: r.data.novo, modo: r.data.modo });
          } else {
            falha(new Error(r.data.erro || "Não deu pra entrar."));
          }
        }, falha);
      });
    };
    try {
      pz.login({
        success: function (r) { pedir(r && r.code, r); },
        fail: function () { pedir(""); },
      });
    } catch (e) {
      pedir("");
    }
  });
}

/** Chamada autenticada. Se o token venceu, entra de novo uma vez e repete. */
function api(metodo, caminho, dados) {
  var vai = function () { return chamada(metodo, caminho, dados, true); };
  var tentar = function () {
    return vai().then(function (r) {
      if (r.status !== 401) return r;
      esquecer();
      return entrar().then(vai);
    });
  };
  if (!token()) return entrar().then(tentar);
  return tentar();
}

/** pz.uploadFile com o token. Resolve com { status, data }. */
function enviarFoto(caminho, arquivo, campos) {
  return new Promise(function (ok, falha) {
    pz.uploadFile({
      url: BASE + caminho,
      filePath: arquivo,
      name: "foto",
      formData: campos || {},
      header: { authorization: "Bearer " + token() },
      timeout: 60000,
      success: function (r) {
        var d = {};
        try { d = typeof r.data === "string" ? JSON.parse(r.data) : r.data || {}; } catch (e) {}
        ok({ status: r.statusCode, data: d });
      },
      fail: function (e) { falha(new Error((e && e.errMsg) || "Sem conexão.")); },
    });
  });
}

/** Depois de apagar a conta: some token, cache e a chave do aparelho (a próxima entrada é uma conta nova). */
function esquecerAparelho() {
  esquecer();
  try { pz.clearStorageSync(); } catch (e) { try { pz.removeStorageSync(K_DEV); } catch (e2) {} }
}

module.exports = { BASE: BASE, entrar: entrar, api: api, enviarFoto: enviarFoto, esquecer: esquecer, esquecerAparelho: esquecerAparelho };
