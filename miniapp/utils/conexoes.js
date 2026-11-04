// Conectar fontes de treino — usado na tela de entrada e nos Ajustes.
var api = require("./api");

/** Abre o OAuth do Strava (web-view no nosso domínio, que redireciona pro Strava). */
function conectarStrava() {
  return api.api("POST", "/api/mini/strava", { acao: "link" }).then(function (r) {
    if (r.status !== 200 || !r.data.url) throw new Error("Não deu agora");
    pz.navigateTo({ url: "/pages/web/web?u=" + encodeURIComponent(r.data.url) });
  });
}

/**
 * Plano B: o web-view do PhizChat às vezes não carrega o login do Strava. O servidor manda o link (vale
 * 30 min) no chat, que abre no navegador do PhizChat; sem telefone, copia o link pra colar no Safari/Chrome.
 * O servidor salva a conexão sozinho e o app mostra ON na volta.
 */
function stravaPeloNavegador() {
  return api.api("POST", "/api/mini/strava", { acao: "link", navegador: true }).then(function (r) {
    if (r.status !== 200 || !r.data.url) throw new Error("Não deu agora");
    if (r.data.chat) {
      pz.showModal({
        title: "Link enviado no chat",
        content: "Mandamos o link no seu chat com o Tá Pago!. Toque nele, entre no Strava e autorize. Depois é só voltar aqui (o link vale 30 minutos).",
        showCancel: false, confirmText: "Entendi",
      });
      return;
    }
    return new Promise(function (ok) {
      pz.setClipboardData({
        data: r.data.url,
        success: function () {
          pz.showModal({
            title: "Link copiado",
            content: "Abra o Safari ou o Chrome, cole o link na barra de endereço e autorize o Strava. Depois é só voltar pro Tá Pago! (o link vale 30 minutos).",
            showCancel: false, confirmText: "Entendi",
          });
          ok();
        },
      });
    });
  });
}

function explicarGarmin() {
  pz.showModal({
    title: "Garmin pelo Strava",
    content: "No app Garmin Connect, ligue a sincronização com o Strava (Mais › Configurações › Apps conectados) e conecte o Strava aqui. Os treinos do seu relógio passam a entrar sozinhos. A conexão direta com a Garmin chega em breve.",
    showCancel: false, confirmText: "Entendi",
  });
}

/** Apple Saúde / Health Connect dependem da ponte no app do PhizChat. */
function explicarSaude(qual) {
  var ios = qual === "apple";
  pz.showModal({
    title: ios ? "Apple Saúde chega em breve" : "Health Connect chega em breve",
    content: ios
      ? "Assim que o PhizChat liberar o acesso ao app Saúde, seus treinos do iPhone e do Apple Watch entram sozinhos. Enquanto isso, conecte o Strava ou registre com uma foto."
      : "Assim que o PhizChat liberar o Health Connect, seus treinos do Samsung Health, Google Fit e do seu relógio entram sozinhos. Enquanto isso, conecte o Strava ou registre com uma foto.",
    showCancel: false, confirmText: "Entendi",
  });
}

function plataforma() {
  try { return String(pz.getSystemInfoSync().platform || "").toLowerCase(); } catch (e) { return ""; }
}

module.exports = { conectarStrava: conectarStrava, stravaPeloNavegador: stravaPeloNavegador, explicarGarmin: explicarGarmin, explicarSaude: explicarSaude, plataforma: plataforma };
