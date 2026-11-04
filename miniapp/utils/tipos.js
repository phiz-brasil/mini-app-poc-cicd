// Espelho de src/lib/tipos.ts do servidor (o servidor é quem valida).
var TIPOS = [
  ["funcional", "Funcional"], ["muscu", "Musculação"], ["corrida", "Corrida"], ["caminhada", "Caminhada"],
  ["bike", "Bike"], ["yoga", "Yoga"], ["natacao", "Natação"], ["luta", "Luta"], ["futebol", "Futebol"], ["outro", "Outro"],
];
var CORES = ["#538FA6", "#7A8C99", "#B08968", "#6A8D73", "#8A6FB0", "#C0785A", "#4F7CAC", "#9C6B8E"];
function corDe(id) {
  var h = 0;
  for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CORES[h % CORES.length];
}
function iniciais(nome) {
  var p = String(nome || "").trim().split(/\s+/).slice(0, 2);
  return p.map(function (x) { return (x[0] || "").toUpperCase(); }).join("") || "?";
}
var TIPOS_COM_KM = ["corrida", "caminhada", "bike", "natacao"];

module.exports = { TIPOS: TIPOS, TIPOS_COM_KM: TIPOS_COM_KM, MANUAL_MAX_DIA: 90, MIN_MIN: 10, MIN_MAX: 180, corDe: corDe, iniciais: iniciais };
