// A cápsula nativa (⋯ ✕) é do PhizChat e fica fixa no canto de cima. Tudo que
// é nosso desce até a linha dela e não entra no espaço à direita.
function barMetrics() {
  var safeTop = 20, capTop = 0, capH = 32, capLeft = 0, largura = 375;
  try {
    var info = pz.getSystemInfoSync();
    largura = info.windowWidth || info.screenWidth || 375;
    safeTop = (info.safeArea && info.safeArea.top) || info.statusBarHeight || 20;
  } catch (e) {}
  try {
    var r = pz.getMenuButtonBoundingClientRect && pz.getMenuButtonBoundingClientRect();
    if (r && r.top) { capTop = r.top; capH = r.height || 32; capLeft = r.left || 0; }
  } catch (e) {}
  if (!capTop) capTop = safeTop + 6;
  return {
    safeTop: safeTop,
    barTop: capTop,                 // topo da linha da cápsula
    barH: capH,
    conteudoTop: capTop + capH + 12, // onde começa o conteúdo
    capDireita: capLeft ? largura - capLeft + 8 : 104,
  };
}
module.exports = { barMetrics: barMetrics };
