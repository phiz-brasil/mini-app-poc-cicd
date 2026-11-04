import { conectar, lerTicket } from "@/lib/strava";
import { pagina } from "@/lib/pagina";

export const maxDuration = 30;

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const uid = lerTicket(q.get("state"));
  if (q.get("error")) return pagina("Não conectou", "Você cancelou no Strava. Dá pra tentar de novo nos Ajustes.", false);
  if (!uid) return pagina("Link vencido", "Volte pro Tá Pago! e toque em Conectar de novo.", false);
  if (!/activity:read/.test(q.get("scope") || "")) return pagina("Falta uma permissão", "Pra trazer seus treinos, marque “ver suas atividades” no Strava.", false);
  try {
    const r = await conectar(uid, String(q.get("code") || ""));
    return pagina("Strava conectado", (r.importados ? `Trouxemos ${r.importados} ${r.importados === 1 ? "treino" : "treinos"} de hoje. ` : "") + "Daqui pra frente seus treinos entram sozinhos. Pode voltar pro Tá Pago!.");
  } catch (e) {
    console.error("[strava/callback]", e);
    return pagina("Não deu certo", "O Strava não confirmou a conexão. Tente de novo em instantes.", false);
  }
}
