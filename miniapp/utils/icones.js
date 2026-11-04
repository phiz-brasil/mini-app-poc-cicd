// Ícones como data URI (SVG). Paleta da marca: limão #C6F432, preto #111111.
function uri(s) { return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s); }
function check(cor, w) {
  return uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.2 4.2L19 7" stroke="' + cor + '" stroke-width="' + (w || 3) + '" stroke-linecap="round" stroke-linejoin="round"/></svg>');
}
function traco(cor, d, w) {
  return uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="' + cor + '" stroke-width="' + (w || 1.8) + '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>');
}
var CAMERA = '<path d="M14.5 4h-5L7 7H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/>';
module.exports = {
  CHECK_CINZA: check("#5C5C5C"),
  CHECK_PRETO: check("#111111", 3.4),
  CHECK_BRANCO: check("#FFFFFF"),
  CHECK_LIMAO: check("#C6F432"),
  MAIS: traco("#111111", '<path d="M12 5v14M5 12h14"/>', 2.8),
  SETA_PRETA: traco("#111111", '<path d="M7 17L17 7M9 7h8v8"/>', 2.2),
  SETA_BRANCA: traco("#FFFFFF", '<path d="M7 17L17 7M9 7h8v8"/>', 2.2),
  MAIS_BRANCO: traco("#FFFFFF", '<path d="M12 5v14M5 12h14"/>', 2.6),
  CAMERA_PRETA: traco("#111111", CAMERA, 2),
  CAMERA_BRANCA: traco("#FFFFFF", CAMERA),
  AJUSTES: traco("#111111", '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  LIXO: traco("#7A7A76", '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', 1.8),
  // Selo verificado do PhizChat: azul #1679E2 (identidade conferida), nunca verde.
  SELO: uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12.00 1.00 L14.43 2.92 L17.50 2.47 L18.65 5.35 L21.53 6.50 L21.08 9.57 L23.00 12.00 L21.08 14.43 L21.53 17.50 L18.65 18.65 L17.50 21.53 L14.43 21.08 L12.00 23.00 L9.57 21.08 L6.50 21.53 L5.35 18.65 L2.47 17.50 L2.92 14.43 L1.00 12.00 L2.92 9.57 L2.47 6.50 L5.35 5.35 L6.50 2.47 L9.57 2.92Z" fill="#1679E2" stroke="#1679E2" stroke-width="1.2" stroke-linejoin="round"/><path d="M7.6 12.2l3 3 5.8-6.2" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'),
  MAIS_PRETO: traco("#111111", '<path d="M12 5v14M5 12h14"/>', 2.4),
  ATIVIDADE: traco("#111111", '<path d="M13 4a1.6 1.6 0 1 0 0 .01M8 21l3-6 3 2 1 4M7 11l3-3 4 1 2 3 3 1M10 8l1 5"/>', 2),
  MOMENTS: traco("#FFFFFF", '<rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.6 7.4h.01"/>', 2),
  GRUPO_LIMAO: traco("#C6F432", '<circle cx="9" cy="8.2" r="3.2"/><path d="M3.5 19.2c.6-3.1 2.9-4.9 5.5-4.9s4.9 1.8 5.5 4.9"/><circle cx="16.6" cy="9.2" r="2.6"/><path d="M15.6 14.4c2.4-.3 4.4 1.3 4.9 4.3"/>', 2),
  GRUPO_PRETO: traco("#111111", '<circle cx="9" cy="8.2" r="3.2"/><path d="M3.5 19.2c.6-3.1 2.9-4.9 5.5-4.9s4.9 1.8 5.5 4.9"/><circle cx="16.6" cy="9.2" r="2.6"/><path d="M15.6 14.4c2.4-.3 4.4 1.3 4.9 4.3"/>', 2),
  CODIGO_PRETO: traco("#111111", '<rect x="3.5" y="6" width="17" height="12" rx="3"/><path d="M7.5 10.2v3.6M10.5 10.2v3.6M13.5 10.2v3.6M16.5 10.2v3.6"/>', 1.9),
  CODIGO: traco("#FFFFFF", '<rect x="3.5" y="6" width="17" height="12" rx="3"/><path d="M7.5 10.2v3.6M10.5 10.2v3.6M13.5 10.2v3.6M16.5 10.2v3.6"/>', 1.9),
  COMPARTILHAR: traco("#111111", '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M8 11H6.5A2.5 2.5 0 0 0 4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4a2.5 2.5 0 0 0-2.5-2.5H16"/>', 2),
  COMPARTILHAR_BRANCO: traco("#FFFFFF", '<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M8 11H6.5A2.5 2.5 0 0 0 4 13.5v4A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-4a2.5 2.5 0 0 0-2.5-2.5H16"/>', 2),
  VOLTAR: traco("#111111", '<path d="M15 5l-7 7 7 7"/>', 2.2),
  VOLTAR_BRANCO: traco("#FFFFFF", '<path d="M15 5l-7 7 7 7"/>', 2.2),
  FOGO: uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#C6F432" d="M12 2c.6 3.1-1.1 4.9-2.7 6.6C7.7 10.3 6 12.1 6 15a6 6 0 0 0 12 0c0-2.4-1-4.2-2.2-5.6-.3 1.4-1 2.5-2.1 3.1.4-3.9-.9-7.9-1.7-10.5z"/></svg>'),
};
