import { NextResponse } from "next/server";
import { lerTicket, stravaConfigurado, urlAutorizar } from "@/lib/strava";
import { pagina } from "@/lib/pagina";
import { origem } from "../../mini/_util";

/** Abre no web-view do miniapp: confere o ticket e manda pro OAuth do Strava. */
export async function GET(req: Request) {
  const t = new URL(req.url).searchParams.get("t");
  if (!stravaConfigurado()) return pagina("Strava em breve", "A conexão com o Strava ainda está sendo ligada. Volte pro Tá Pago!.", false);
  if (!lerTicket(t)) return pagina("Link vencido", "Volte pro Tá Pago! e toque em Conectar de novo.", false);
  return NextResponse.redirect(urlAutorizar(origem(req), String(t)));
}
