// Tá Pago! — miniapp nativo (PhizClip: modelo WeChat sobre FinClip).
// Markup .pxml com diretivas wx:, estilo .pzss em rpx, API pz.*.
//
// Poppins só em título e número; o resto é a fonte do sistema. A fonte vem do
// nosso servidor — o domínio precisa estar na allowlist do console.
var BASE = require("./utils/api").BASE;

App({
  onLaunch: function () {
    // Unbounded: larga e pesada, pros números e títulos grandes (estilo da referência).
    ["600", "800"].forEach(function (w) {
      try {
        pz.loadFontFace({ family: "Unbounded", source: 'url("' + BASE + '/fonts/unbounded-' + w + '-latin.woff2")', desc: { weight: w }, global: true, fail: function () {} });
      } catch (e) {}
    });
    var pesos = ["500", "600", "700"];
    pesos.forEach(function (w) {
      try {
        pz.loadFontFace({
          family: "Poppins",
          source: 'url("' + BASE + "/fonts/poppins-" + w + '-latin.woff2")',
          desc: { weight: w },
          global: true,
          fail: function () {},
        });
      } catch (e) {
        // Host sem loadFontFace: segue com a fonte do sistema.
      }
    });
  },
  // cutucar: desligado até as mensagens chegarem no chat de todo mundo (hoje só quem está na lista do beta).
  globalData: { versao: "1.2.0", cutucar: false },
});
