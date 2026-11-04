// "Quero receber notificações": manda pro servidor o que o botão getPhoneNumber do PhizChat devolveu.
// O servidor guarda o número se ele vier direto; se vier só um código, registra o formato (diagnóstico).
var api = require("./api");

function pluginInfo() {
  try {
    var pl = requirePlugin("getPhoneNumberPlugins");
    if (!pl) return "vazio";
    var nomes = {};
    try { Object.keys(pl).forEach(function (k) { nomes[k] = typeof pl[k]; }); } catch (e) {}
    try { for (var k in pl) nomes[k] = typeof pl[k]; } catch (e) {}
    return nomes;
  } catch (e) { return "erro: " + String(e && e.message || e).slice(0, 80); }
}

function enviar(detalhe) {
  return api.api("POST", "/api/mini/telefone", { detalhe: detalhe || {}, plugin: pluginInfo() }).then(function (r) {
    return r.status === 200 ? r.data : { ligado: false };
  }, function () { return { ligado: false }; });
}

// O PhizChat pode não responder ao botão open-type="getPhoneNumber" (testado em 21/10: não respondeu).
// Plano B: tocou e em 2,5 s nada veio → manda mesmo assim (o servidor usa a lista do beta).
function tocou(depois) {
  var feito = false;
  var t = setTimeout(function () {
    if (feito) return; feito = true;
    enviar({ errMsg: "getPhoneNumber:sem-resposta" }).then(depois);
  }, 2500);
  return function (detalhe) {
    if (feito) return; feito = true; clearTimeout(t);
    enviar(detalhe).then(depois);
  };
}

module.exports = { enviar: enviar, tocou: tocou };
