// Frases da tela de parabéns. A primeira que casar com o momento ganha;
// sem contexto especial, sorteia uma das gerais (sem repetir a última).
var GERAIS = [
  "Feito é melhor que perfeito.",
  "Hoje você venceu a preguiça.",
  "Um treino de cada vez. Hoje foi o seu.",
  "Seu corpo agradece amanhã.",
  "Disciplina é lembrar o que você quer.",
  "Quem aparece todo dia, chega.",
  "Não precisa ser fácil. Precisa ser feito.",
  "Mais um tijolo na sua melhor versão.",
  "Treinou cansado? Vale em dobro.",
  "A desculpa perdeu hoje.",
];

function frase(r) {
  r = r || {};
  if (r.posAntes && r.pos && r.pos < r.posAntes) return { tit: "Você subiu pro " + r.pos + "º!", sub: "Passou " + (r.posAntes - r.pos) + (r.posAntes - r.pos === 1 ? " pessoa" : " pessoas") + " no ranking de hoje." };
  if (r.pos === 1 && r.total > 1) return { tit: r.genero === 2 ? "Você é a 1ª de hoje!" : "Você é o 1º de hoje!", sub: "Ninguém treinou mais que você. Segura essa." };
  if (r.seq >= 7) return { tit: r.seq + " dias seguidos!", sub: "Uma semana inteira sem falhar. Isso é hábito." };
  if (r.seq >= 3) return { tit: r.seq + " dias seguidos!", sub: "A sequência tá forte. Não deixa quebrar amanhã." };
  if (r.treinosHoje >= 2) return { tit: "Dois treinos hoje?!", sub: "Você tá em outro nível." };
  var ultima = "";
  try { ultima = pz.getStorageSync("tp_ultima_frase") || ""; } catch (e) {}
  var lista = GERAIS.filter(function (f) { return f !== ultima; });
  var f = lista[Math.floor(Math.random() * lista.length)];
  try { pz.setStorageSync("tp_ultima_frase", f); } catch (e) {}
  return { tit: r.primeiroDoDia ? "Primeiro treino do dia!" : "Tá pago!", sub: f };
}

module.exports = { frase: frase };
