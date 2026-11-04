// Selos de nível: um por faixa (formato e cor), servidos pelo servidor em /nivel/selo-<faixa>.png.
var api = require("./api");

// Destaque de cada faixa sobre fundo escuro (Lenda é preta, então usa o limão dela).
var ACENTO = { bicho: "#E9A46C", forte: "#C6F432", sinistro: "#2EC4B6", casca: "#FF7A1A", monstro: "#A78BFA", lenda: "#C6F432", black: "#E8C66A" };

// Quanto empurrar cada número (0–100) pro centro do selo, em milésimos da fonte: o Unbounded tem o peso
// fora do meio (o "1" tem a haste à direita). Medido pelo centro de massa do desenho de cada número.
var CENTRO_NUM = [2,-38,-12,-30,-30,4,6,-19,2,-2,-29,-39,-40,-52,-38,-37,-39,-16,-52,-45,-2,-3,-12,-22,-2,-14,-18,23,-35,-23,-10,-14,-20,-30,-11,-23,-26,13,-43,-31,-30,-33,-39,-50,-30,-41,-46,-6,-63,-50,16,13,6,-4,15,3,-1,40,-18,-5,23,21,13,4,24,10,6,49,-11,1,-44,-40,-53,-64,-43,-53,-57,-19,-74,-62,38,31,27,18,39,23,20,62,2,15,19,16,9,0,20,6,2,44,-15,-2,-27];

// Selos de face escura: número na cor da faixa.
var COR_NUM = { lenda: "#C6F432", black: "#E8C66A" };

function acento(f) { return ACENTO[f.id] || f.cor; }
function selo(id) { return api.BASE + "/nivel/selo-" + id + ".png"; }

// Estilo do número em cima do selo: tamanho (rpx, menor com 3 dígitos), centro ótico e cor.
function numero(n, faixa, tam) {
  var fs = n >= 100 ? Math.round(tam * 0.82) : tam;
  var st = "font-size: " + fs + "rpx; transform: translateX(" + Math.round((CENTRO_NUM[n] || 0) * fs / 100) / 10 + "rpx);";
  return COR_NUM[faixa] ? st + " color: " + COR_NUM[faixa] + "; text-shadow: 0 " + Math.max(2, Math.round(tam / 27)) + "rpx 0 rgba(0,0,0,.6);" : st;
}

module.exports = { acento: acento, selo: selo, numero: numero };
