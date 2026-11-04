import { NextResponse } from "next/server";
import { origem } from "../../mini/_util";

/**
 * Cria (uma vez) a assinatura do webhook do Strava. Protegido:
 * Authorization: Bearer <TAPAGO_SESSION_SECRET>.
 */
export async function POST(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.TAPAGO_SESSION_SECRET}`) return new Response("Proibido", { status: 403 });
  const body = new URLSearchParams({
    client_id: String(process.env.STRAVA_CLIENT_ID), client_secret: String(process.env.STRAVA_CLIENT_SECRET),
    callback_url: `${origem(req)}/api/strava/webhook`, verify_token: String(process.env.STRAVA_VERIFY_TOKEN),
  });
  const r = await fetch("https://www.strava.com/api/v3/push_subscriptions", { method: "POST", body });
  return NextResponse.json({ status: r.status, resposta: await r.json().catch(() => null) });
}
