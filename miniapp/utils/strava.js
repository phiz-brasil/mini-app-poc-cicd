// "View on Strava" (regra de marca do Strava): abre a atividade no web-view.
function verNoStrava(url) {
  if (url) pz.navigateTo({ url: "/pages/web/web?u=" + encodeURIComponent(url) + "&t=Strava" });
}
module.exports = { verNoStrava: verNoStrava, BOTAO: "/images/strava-connect.png", POWERED: "/images/strava-powered.png" };
