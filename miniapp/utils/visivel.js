// "Quem pode ver": geral + meus grupos. Os pontos contam sempre; isso só decide em que timeline aparece.
var api = require("./api");

function carregarGrupos() {
  return api.api("GET", "/api/mini/grupos").then(function (r) { return (r.data && r.data.grupos) || []; }, function () { return []; });
}

// Monta as opções (tudo marcado por padrão, ou o que já estava salvo).
function opcoes(grupos, atual) {
  var geral = !atual || atual.geral !== false;
  var todos = !atual || atual.grupos === "todos";
  return [{ id: "_geral", nome: "Geral", on: geral }].concat(grupos.map(function (g) {
    return { id: g.id, nome: g.nome, on: todos || (atual.grupos || []).indexOf(g.id) >= 0 };
  }));
}

function paraEnviar(ops) {
  var geral = false, grupos = [], todos = true;
  ops.forEach(function (o) { if (o.id === "_geral") geral = o.on; else if (o.on) grupos.push(o.id); else todos = false; });
  return { geral: geral, grupos: todos ? "todos" : grupos };
}

module.exports = { carregarGrupos: carregarGrupos, opcoes: opcoes, paraEnviar: paraEnviar };
