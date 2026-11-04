var api = require("../../utils/api");

Page({
  data: { src: "" },
  onLoad: function (o) {
    this.setData({ src: o && o.u ? decodeURIComponent(o.u) : "" });
    if (o && o.t) pz.setNavigationBarTitle({ title: decodeURIComponent(o.t) });
  },

  // Cada página que abre (nosso domínio → strava.com → callback). Sem o token do link.
  carregou: function (e) { diag("webview-load", e.detail); },

  // O PhizChat barrou ou a página não carregou: registra e oferece o link pelo chat.
  falhou: function (e) {
    diag("webview-erro", e.detail);
    if (this.avisou) return;
    this.avisou = true;
    pz.showModal({
      title: "O Strava não abriu aqui",
      content: "Mandamos o link pro seu chat com o Tá Pago!? Lá ele abre no navegador do PhizChat.",
      confirmText: "Mandar", cancelText: "Agora não",
      success: function (r) {
        if (!r.confirm) return;
        require("../../utils/conexoes").stravaPeloNavegador().then(function () {}, function () {
          pz.showToast({ title: "Não deu agora", icon: "none" });
        });
      },
    });
  },
});

function diag(evento, d) {
  var det = {};
  try { for (var k in d) det[k] = typeof d[k] === "string" ? d[k].replace(/([?&](t|state|code)=)[^&]*/g, "$1…") : d[k]; } catch (e) {}
  var sis = {};
  try { var s = pz.getSystemInfoSync(); sis = { platform: s.platform, version: s.version, SDKVersion: s.SDKVersion }; } catch (e) {}
  api.api("POST", "/api/mini/diag", { evento: evento, dados: { detalhe: det, sistema: sis } });
}
