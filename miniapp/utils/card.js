// Card do treino sem foto (os do Strava): cor e ícone por categoria.
// Escuro pra todos: categoria num selo limão, número grande em branco; com trajeto, mapa escuro de fundo.
// O laranja fica só no selo "Powered by Strava".
var tiposIc = require("./icones-tipos");

function card(c) {
  if (!c) return null;
  var ic = tiposIc.cheio[c.k] || tiposIc.cheio.outro;
  return {
    k: c.k, nome: c.nome, v: c.v, u: c.u, stats: c.stats || [], mapa: c.mapa || "",
    ic: ic, marca: tiposIc.cor(ic, "#FFFFFF"),
  };
}

// Miniatura quadrada (lista de treinos do perfil): fundo escuro, ícone limão.
function mini(k) {
  var ic = tiposIc.cheio[k] || tiposIc.cheio.outro;
  return { cls: "", ic: tiposIc.cor(ic, "#C6F432") };
}

module.exports = { card: card, mini: mini };
