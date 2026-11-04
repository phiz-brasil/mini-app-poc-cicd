import { NextResponse } from "next/server";
import { alterarBanco } from "@/lib/store";
import { boasVindas, telefoneDaLista } from "@/lib/mensagens";
import { lerBanco } from "@/lib/store";
import { registrarDiag } from "@/lib/diag";
import { exigir, falha } from "../_util";

/**
 * "Quero receber notificações": o que o botão getPhoneNumber do PhizChat devolveu.
 * Se vier o número direto (phoneNumber / purePhoneNumber + countryCode), guarda e manda as
 * boas-vindas. Se vier só um código (precisa do login unificado pra trocar), registra o formato.
 * Um telefone é de uma conta só.
 */
function numero(d: Record<string, unknown>): string {
  const cru = String(d.phoneNumber || d.phone || d.mobile || "");
  const puro = String(d.purePhoneNumber || "");
  const ddi = String(d.countryCode || "").replace(/\D/g, "");
  let n = cru.replace(/[^\d+]/g, "");
  if (!n && puro) n = (ddi ? "+" + ddi : "+55") + puro.replace(/\D/g, "");
  if (n && !n.startsWith("+")) n = (n.length <= 11 ? "+55" : "+") + n.replace(/^0+/, "");
  return /^\+\d{10,15}$/.test(n) ? n : "";
}

export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const b = (await req.json().catch(() => ({}))) as { detalhe?: Record<string, unknown>; plugin?: unknown };
    const d = b.detalhe || {};
    let tel = numero(d);
    const veioDoPhiz = !!tel;
    // Beta: se o PhizChat não devolveu o número, usa a lista PhizID→telefone (só pra quem está nela).
    if (!tel) { const eu = (await lerBanco()).usuarios[uid]; tel = telefoneDaLista(eu?.phizId) || ""; }
    await registrarDiag({ em: new Date().toISOString(), evento: "getPhoneNumber", dados: JSON.stringify({
      campos: Object.keys(d).slice(0, 20), errMsg: d.errMsg || "", temCode: !!d.code, temCripto: !!d.encryptedData, numeroDoPhiz: veioDoPhiz, usouLista: !veioDoPhiz && !!tel, plugin: b.plugin ?? null,
    }).slice(0, 2000) }).catch(() => {});
    if (!tel) return NextResponse.json({ ok: true, ligado: false, motivo: d.code ? "codigo" : d.encryptedData ? "cripto" : "sem-numero" });
    const r = await alterarBanco(x => {
      if (Object.values(x.usuarios).some(u => u.id !== uid && u.telefone === tel)) return { ja: true, u: null };
      const u = x.usuarios[uid];
      if (!u) return { ja: false, u: null };
      const novo = !u.telefone;
      u.telefone = tel; u.avisos = true;
      return { ja: false, u: novo ? u : null };
    });
    if (r.ja) return NextResponse.json({ ok: true, ligado: false, motivo: "em-uso" });
    if (r.u) await boasVindas(r.u).catch(e => console.error("[boas-vindas]", e));
    return NextResponse.json({ ok: true, ligado: true, origem: veioDoPhiz ? "phizchat" : "lista" });
  } catch (e) {
    return falha(e);
  }
}
