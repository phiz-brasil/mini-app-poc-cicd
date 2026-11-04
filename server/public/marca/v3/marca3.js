const fs = require("fs");
const opentype = require("opentype.js");
const font = opentype.loadSync(require("path").join(__dirname, "../../../assets-og/unbounded-800.ttf"));
const L = "#C6F432", P = "#111111";

// Símbolo original (ta-pago-icone.svg): check de pontas redondas. Caixa justa do traço
// (21.5..99.5 × 28.5..91.5 no quadro de 120) levada pra 0..200 e centralizada na vertical.
const simbolo = cor => `<g transform="translate(0 19) scale(2.564) translate(-21.5 -28.5)"><path d="M30 62 L51 83 L91 37" fill="none" stroke="${cor}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const svg = (w, h, c) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${c}</svg>`;

function texto(t, size, x, y, track) {
  let d = "", cx = x; const gl = font.stringToGlyphs(t);
  gl.forEach((g, i) => { d += g.getPath(cx, y, size).toPathData(2); cx += g.advanceWidth * size / font.unitsPerEm + track; if (gl[i + 1]) cx += font.getKerningValue(g, gl[i + 1]) * size / font.unitsPerEm; });
  return { d, w: cx - x - track };
}
const icone = (fundo, cor) => svg(240, 240, `<rect width="240" height="240" rx="60" fill="${fundo}"/><path d="M60 124 L102 166 L182 74" fill="none" stroke="${cor}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`);
// Logo: símbolo + TÁ PAGO! (inclinado como o raio)
function logo(corSim, corTxt, corExcl) {
  const t = texto("TÁ PAGO", 120, 0, 0, -2);
  const ex = t.w + 32;
  const W = Math.ceil(176 + 30 + ex + 40), H = 190;
  const txt = `<g transform="translate(206 150) skewX(-9)"><path d="${t.d}" fill="${corTxt}"/><path d="M${ex + 6} -86 L${ex + 6} -34" stroke="${corExcl}" stroke-width="26" stroke-linecap="round"/><circle cx="${ex + 6}" cy="-4" r="14" fill="${corExcl}"/></g>`;
  return svg(W, H, `<g transform="translate(4 4) scale(0.9)">${simbolo(corSim)}</g>${txt}`);
}
const out = (n, s) => fs.writeFileSync(`v3/${n}.svg`, s);
fs.mkdirSync("v3", { recursive: true });
out("simbolo-preto", svg(200, 200, simbolo(P))); out("simbolo-limao", svg(200, 200, simbolo(L)));
out("icone-preto", icone(P, L)); out("icone-limao", icone(L, P));
out("logo-preto", logo(P, P, P)); out("logo-branco", logo(L, "#FFFFFF", L)); out("logo-escuro-limao", logo(P, P, P));
console.log("ok");
