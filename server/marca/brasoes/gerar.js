// Brasões das faixas do Tá Pago! — viewBox 240x240, formas que evoluem a cada faixa.
const fs = require("fs");
const S = (corpo, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs>${defs}</defs>${corpo}</svg>`;
const grad = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

// Escudo base (topo reto, ponta embaixo)
const escudo = (s = 1, dy = 0) => { const p = (x, y) => `${120 + (x - 120) * s} ${120 + (y - 120) * s + dy}`; return `M${p(46,40)} L${p(194,40)} L${p(194,118)} C${p(194,170)} ${p(160,198)} ${p(120,214)} C${p(80,198)} ${p(46,170)} ${p(46,118)} Z`; };
const hex = (r, cx = 120, cy = 120) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + i * Math.PI / 3; return `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(" L");

// Ramos de louro: folhas ao longo de uma curva (Bézier), viradas pra fora, espelhadas.
function louros() {
  const P0 = [112, 224], P1 = [16, 178], P2 = [46, 58];
  const pt = t => [(1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t * t * P2[0], (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t * t * P2[1]];
  const tan = t => Math.atan2(2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]), 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0])) * 180 / Math.PI;
  let out = "";
  const ramo = `M${P0} Q${P1} ${P2}`;
  out += `<path d="${ramo}" fill="none" stroke="#C6F432" stroke-width="5" stroke-linecap="round"/>`;
  out += `<path d="M${240 - P0[0]} ${P0[1]} Q${240 - P1[0]} ${P1[1]} ${240 - P2[0]} ${P2[1]}" fill="none" stroke="#C6F432" stroke-width="5" stroke-linecap="round"/>`;
  for (let k = 0; k < 7; k++) {
    const t = 0.16 + k * 0.125, [x, y] = pt(t), a = tan(t);
    for (const lado of [-1, 1]) {
      const ang = a + lado * 38, cx = x + Math.cos(ang * Math.PI / 180) * 12, cy = y + Math.sin(ang * Math.PI / 180) * 12;
      const sz = 1 - k * 0.05;
      out += `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(13 * sz).toFixed(1)}" ry="${(6 * sz).toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})"/>`;
      const mx = 240 - cx, ma = 180 - ang;
      out += `<ellipse cx="${mx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(13 * sz).toFixed(1)}" ry="${(6 * sz).toFixed(1)}" transform="rotate(${ma.toFixed(1)} ${mx.toFixed(1)} ${cy.toFixed(1)})"/>`;
    }
  }
  return out;
}

const B = {
  // 1. Bicho solto — medalha redonda com três arranhões de garra
  bicho: S(`
    <circle cx="120" cy="120" r="96" fill="url(#g)"/>
    <circle cx="120" cy="120" r="96" fill="none" stroke="#111" stroke-opacity=".12" stroke-width="4"/>
    <circle cx="120" cy="120" r="78" fill="none" stroke="#111" stroke-opacity=".18" stroke-width="3" stroke-dasharray="4 8"/>
    <g fill="#111">
      <path d="M86 156 C96 128 108 102 126 80 C114 106 104 130 96 160 Z"/>
      <path d="M110 166 C120 136 134 108 154 84 C140 112 128 138 120 170 Z"/>
      <path d="M136 170 C144 146 156 124 172 106 C160 128 150 150 144 174 Z" opacity=".85"/>
    </g>`, grad("g", "#F4F4F1", "#D3D3CE")),

  // 2. Forte — hexágono limão com halter
  forte: S(`
    <path d="M${hex(104)} Z" fill="#111"/>
    <path d="M${hex(94)} Z" fill="url(#g)"/>
    <path d="M${hex(78)} Z" fill="none" stroke="#111" stroke-opacity=".16" stroke-width="3"/>
    <g fill="#111">
      <rect x="62" y="96" width="18" height="48" rx="6"/><rect x="82" y="104" width="12" height="32" rx="4"/>
      <rect x="160" y="96" width="18" height="48" rx="6"/><rect x="146" y="104" width="12" height="32" rx="4"/>
      <rect x="92" y="114" width="56" height="12" rx="4"/>
    </g>`, grad("g", "#DAFF6A", "#A9D61A")),

  // 3. Sinistro — losango com raio
  sinistro: S(`
    <path d="M120 10 L230 120 L120 230 L10 120 Z" fill="#111"/>
    <path d="M120 24 L216 120 L120 216 L24 120 Z" fill="url(#g)"/>
    <path d="M120 46 L194 120 L120 194 L46 120 Z" fill="none" stroke="#111" stroke-opacity=".18" stroke-width="3"/>
    <path d="M132 58 L88 128 L116 128 L104 182 L152 106 L124 106 Z" fill="#111" stroke="#111" stroke-width="4" stroke-linejoin="round"/>`, grad("g", "#5FE3D7", "#1FA597")),

  // 4. Casca grossa — escudo blindado com rebites e três divisas
  casca: S(`
    <path d="${escudo(1.08, -6)}" fill="#111"/>
    <path d="${escudo(1)}" fill="url(#g)"/>
    <path d="${escudo(0.8, -4)}" fill="none" stroke="#111" stroke-opacity=".2" stroke-width="3"/>
    <g fill="#111" opacity=".55"><circle cx="62" cy="56" r="5"/><circle cx="178" cy="56" r="5"/><circle cx="62" cy="128" r="5"/><circle cx="178" cy="128" r="5"/></g>
    <g fill="none" stroke="#111" stroke-width="15" stroke-linecap="round" stroke-linejoin="round">
      <path d="M86 112 L120 90 L154 112"/><path d="M86 142 L120 120 L154 142"/><path d="M86 172 L120 150 L154 172"/>
    </g>`, grad("g", "#FFA14F", "#F06400")),

  // 5. Monstro — escudo com chifres e a bocarra
  monstro: S(`
    <path d="M58 52 C40 40 30 20 36 4 C52 18 66 26 84 40 Z" fill="#111"/>
    <path d="M182 52 C200 40 210 20 204 4 C188 18 174 26 156 40 Z" fill="#111"/>
    <path d="${escudo(1.08, -2)}" fill="#111"/>
    <path d="${escudo(1, 4)}" fill="url(#g)"/>
    <g fill="#FFFFFF"><path d="M78 104 L104 98 L100 116 Z"/><path d="M162 104 L136 98 L140 116 Z"/></g>
    <path d="M70 134 L170 134 L162 172 C150 190 90 190 78 172 Z" fill="#111"/>
    <path d="M78 134 L88 152 L98 134 L108 152 L118 134 L128 152 L138 134 L148 152 L158 134 L162 134 Z" fill="#FFFFFF"/>
    <path d="M84 176 L94 162 L104 178 L114 162 L124 178 L134 162 L144 178 L154 164 L158 172 C146 186 94 186 84 176 Z" fill="#FFFFFF"/>`, grad("g", "#A98BFF", "#6D3FE0")),

  // 6. Lenda — escudo escuro com louros e estrela limão
  lenda: S(`
    <g fill="#C6F432">${louros()}</g>
    <path d="${escudo(0.86, 4)}" fill="#C6F432"/>
    <path d="${escudo(0.8, 6)}" fill="url(#g)"/>
    <path d="M120 70 L133 104 L170 106 L141 128 L151 164 L120 144 L89 164 L99 128 L70 106 L107 104 Z" fill="#C6F432"/>`, grad("g", "#2A2A2A", "#0B0B0B")),

  // 7. Tá Pago Black — escudo preto com coroa, asas e gema dourada
  black: S(`
    <g fill="url(#ouro)">
      <path d="M44 92 C20 96 6 120 4 146 C22 132 38 130 50 132 C34 142 26 158 26 176 C40 162 52 156 62 156 Z"/>
      <path d="M196 92 C220 96 234 120 236 146 C218 132 202 130 190 132 C206 142 214 158 214 176 C200 162 188 156 178 156 Z"/>
      <path d="M76 64 L86 30 L104 52 L120 20 L136 52 L154 30 L164 64 Z"/><circle cx="86" cy="26" r="6"/><circle cx="120" cy="15" r="7"/><circle cx="154" cy="26" r="6"/>
    </g>
    <path d="${escudo(0.92, 14)}" fill="url(#ouro)"/>
    <path d="${escudo(0.85, 16)}" fill="url(#g)"/>
    <path d="M120 86 L152 114 L120 172 L88 114 Z" fill="url(#ouro)"/>
    <path d="M88 114 L152 114 M104 114 L120 86 L136 114 M120 172 L104 114 M120 172 L136 114" fill="none" stroke="#0B0B0B" stroke-opacity=".35" stroke-width="3" stroke-linejoin="round"/>`,
    grad("g", "#262626", "#050505") + grad("ouro", "#F6DE97", "#C9A043")),
};
for (const [k, v] of Object.entries(B)) fs.writeFileSync(k + ".svg", v);
const nomes = { bicho: "Bicho solto", forte: "Forte", sinistro: "Sinistro", casca: "Casca grossa", monstro: "Monstro", lenda: "Lenda", black: "Tá Pago Black" };
const html = `<!doctype html><meta charset=utf-8><body style="margin:0;padding:30px;background:#F2F2EF;font-family:-apple-system,Inter,sans-serif;display:flex;gap:26px;flex-wrap:wrap">` +
  Object.keys(B).map(k => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><img src="${k}.svg" width="150" height="150"><b style="font-size:14px">${nomes[k]}</b></div>`).join("") +
  `<div style="flex-basis:100%"></div><div style="display:flex;gap:26px;padding:24px;border-radius:24px;background:#141414">` + Object.keys(B).map(k => `<img src="${k}.svg" width="72" height="72">`).join("") + `</div>` +
  `<div style="display:flex;gap:18px;align-items:center;padding:20px">` + Object.keys(B).map(k => `<img src="${k}.svg" width="32" height="32">`).join("") + `</div>`;
fs.writeFileSync("index.html", html);
