// Câmera na hora, sem galeria (regra do Tá Pago!: a foto prova o treino).
// chooseMedia quando existe; senão chooseImage. Cancelar não é erro.
function tirar(pronta) {
  var plano_b = function () {
    pz.chooseImage({
      count: 1, sourceType: ["camera"], sizeType: ["compressed"],
      success: function (r) { pronta(r.tempFilePaths[0]); },
    });
  };
  if (pz.chooseMedia) {
    pz.chooseMedia({
      count: 1, mediaType: ["image"], sourceType: ["camera"], sizeType: ["compressed"], camera: "back",
      success: function (r) { pronta(r.tempFiles[0].tempFilePath); },
      fail: function (e) { if (!/cancel/i.test((e && e.errMsg) || "")) plano_b(); },
    });
  } else {
    plano_b();
  }
}
module.exports = { tirar: tirar };
