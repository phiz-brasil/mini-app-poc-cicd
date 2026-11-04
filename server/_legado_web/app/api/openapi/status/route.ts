import { NextResponse } from "next/server";
import { listarRobos, openapiConfigurada, OPENAPI_APP_ID } from "@/lib/phiz-openapi";
import { uidAtual } from "@/lib/sessao";

/** Diagnóstico da integração: o token sai? quais robôs o app enxerga? */
export async function GET() {
  if (!(await uidAtual())) return NextResponse.json({ erro: "Sem sessão." }, { status: 401 });
  if (!openapiConfigurada()) return NextResponse.json({ appId: OPENAPI_APP_ID, configurada: false, falta: ["PHIZ_OPENAPI_HOST", "PHIZ_APP_SECRET"].filter(k => !process.env[k]) });
  try {
    const r = await listarRobos();
    return NextResponse.json({ appId: OPENAPI_APP_ID, configurada: true, token: "ok", robos: r.list.map(x => ({ id: x.robotId, nome: x.robotName })) });
  } catch (e) {
    return NextResponse.json({ appId: OPENAPI_APP_ID, configurada: true, erro: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
