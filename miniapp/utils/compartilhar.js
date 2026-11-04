// Postar no Moments DA PESSOA (no perfil dela), não pela conta Tá Pago!.
// Usa o que o PhizChat oferecer, nesta ordem:
//   1. pz.showShareImageMenu — abre o menu do app pra compartilhar a imagem (padrão WeChat)
//   2. salvar no álbum — a pessoa posta na mão
// Se nada disso der, abre a imagem em tela cheia (segurar pra salvar).
function baixar(url) {
  return new Promise(function (ok, falha) {
    pz.downloadFile({
      url: url,
      success: function (r) { r.statusCode === 200 ? ok(r.tempFilePath) : falha(new Error("download " + r.statusCode)); },
      fail: falha,
    });
  });
}

function abrir(url) { try { pz.previewImage({ urls: [url], current: url }); } catch (e) {} }

function salvar(url) {
  return baixar(url).then(function (caminho) {
    return new Promise(function (ok, falha) { pz.saveImageToPhotosAlbum({ filePath: caminho, success: ok, fail: falha }); });
  }).then(function () { return "salvo"; }, function () { abrir(url); return "aberto"; });
}

// Teste: o PhizChat tem um pz.finchatShare sem documentação. Chama com a imagem (link e
// arquivo local, nos formatos mais prováveis) e manda o que ele respondeu pro diagnóstico.
// Se não abrir nada, segue pro plano B (salvar). Devolve "finchat" quando deu certo.
function testarFinchatShare(url, caminho) {
  return new Promise(function (ok) {
    if (typeof pz.finchatShare !== "function") return ok(null);
    var api = require("./api");
    var fim = false;
    // Todo retorno vai pro diagnóstico (até um "success" que chegue depois do tempo); a tela segue no primeiro.
    var acabar = function (tipo, r) {
      var dados = {};
      try { dados = JSON.parse(JSON.stringify(r || {})); } catch (e) { dados = { erro: String(r) }; }
      api.api("POST", "/api/mini/diag", { evento: "finchatShare:" + tipo, dados: dados });
      if (fim) return; fim = true;
      ok(tipo === "success" ? "finchat" : null);
    };
    try {
      pz.finchatShare({
        type: "image", shareType: "image", scene: "moments", target: "moments",
        imageUrl: url, imgUrl: url, url: url, image: caminho, imagePath: caminho, filePath: caminho, path: caminho,
        title: "Tá Pago!", desc: "Treinou? Tá pago.",
        success: function (r) { acabar("success", r); },
        fail: function (e) { acabar("fail", e); },
      });
    } catch (e) { acabar("erro", { msg: String(e && e.message || e) }); }
    setTimeout(function () { if (!fim) acabar("sem-resposta", {}); }, 8000);
  });
}

// Devolve "finchat" (o PhizChat abriu o compartilhamento), "menu", "salvo" ou "aberto".
function postarNoMeuMoments(url) {
  // pz.finchatShare existe mas responde "api not implemented" (testado em 21/10/2026): não usar.
  if (typeof pz.showShareImageMenu !== "function") return salvar(url);
  return baixar(url).then(function (caminho) {
    return new Promise(function (ok) {
      pz.showShareImageMenu({ path: caminho, success: function () { ok("menu"); }, fail: function () { ok(null); } });
    });
  }).then(function (r) { return r || salvar(url); }, function () { return salvar(url); });
}

// "Compartilhar no Moments" pelo menu ⋯ do PhizChat (shareTimeline), se o app suportar.
function ligarMenuDoPhiz() {
  try { pz.showShareMenu({ withShareTicket: false, menus: ["shareAppMessage", "shareTimeline"] }); } catch (e) {}
}

module.exports = { postarNoMeuMoments: postarNoMeuMoments, salvar: salvar, ligarMenuDoPhiz: ligarMenuDoPhiz };
