// Amigos do PhizChat (pz.getFriends). O formato não é documentado: aceita os nomes de campo
// mais comuns e manda só o FORMATO (nomes de campo e quantidade) pro diagnóstico.
var api = require("./api");

function pegar(o, chaves) { for (var i = 0; i < chaves.length; i++) { var v = o && o[chaves[i]]; if (v != null && v !== "") return v; } return ""; }

function normalizar(r) {
  var lista = Array.isArray(r) ? r : (r && (r.friends || r.list || r.data || r.result || r.items || r.contacts)) || [];
  if (lista && !Array.isArray(lista) && Array.isArray(lista.list)) lista = lista.list;
  if (!Array.isArray(lista)) lista = [];
  return lista.map(function (a) {
    return {
      phizId: String(pegar(a, ["userId", "phizId", "uid", "id", "openId", "userid", "accountId"])),
      nome: String(pegar(a, ["nickName", "nickname", "name", "remark", "userName", "username", "displayName"])),
      avatar: String(pegar(a, ["avatarUrl", "avatar", "headImg", "headImgUrl", "portrait", "photo"])),
    };
  }).filter(function (a) { return a.phizId && a.phizId !== "undefined"; });
}

function formato(r) {
  try {
    var bruto = Array.isArray(r) ? r : (r && (r.friends || r.list || r.data || r.result || r.items || r.contacts));
    var primeiro = Array.isArray(bruto) ? bruto[0] : null;
    return { chaves: r && typeof r === "object" ? Object.keys(r).slice(0, 20) : typeof r, qtd: Array.isArray(bruto) ? bruto.length : 0,
      campos: primeiro && typeof primeiro === "object" ? Object.keys(primeiro).slice(0, 30) : [] };
  } catch (e) { return { erro: String(e) }; }
}

function buscar() {
  return new Promise(function (ok) {
    if (typeof pz.getFriends !== "function") return ok({ lista: [], erro: "sem getFriends" });
    var fim = false;
    var acabar = function (x) { if (!fim) { fim = true; ok(x); } };
    try {
      pz.getFriends({
        success: function (r) {
          api.api("POST", "/api/mini/diag", { evento: "getFriends:success", dados: formato(r) });
          acabar({ lista: normalizar(r) });
        },
        fail: function (e) {
          api.api("POST", "/api/mini/diag", { evento: "getFriends:fail", dados: { errMsg: (e && e.errMsg) || String(e) } });
          acabar({ lista: [], erro: (e && e.errMsg) || "falhou" });
        },
      });
    } catch (e) { acabar({ lista: [], erro: String(e && e.message || e) }); }
    setTimeout(function () { acabar({ lista: [], erro: "sem resposta" }); }, 8000);
  });
}

module.exports = { buscar: buscar };
