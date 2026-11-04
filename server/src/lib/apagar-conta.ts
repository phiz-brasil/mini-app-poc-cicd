import { get, put } from "@vercel/blob";
import { alterarBanco, apagarFoto, lerBanco } from "./store";

/**
 * "Apagar minha conta" (Ajustes do miniapp). Apaga de verdade, sem lixeira:
 * pessoa, telefone, treinos e fotos, tá pagos, cutucadas, troféus, convites, Strava
 * (desautoriza no Strava também) e o rastro nas métricas. Grupos: sai de todos; se
 * criou um grupo com outras pessoas, o mais antigo vira o admin; grupo só dela some.
 * Posts que já foram pros Moments pela conta oficial ficam lá (são da conta oficial).
 */
export async function apagarConta(uid: string) {
  const antes = await lerBanco();
  const u = antes.usuarios[uid];
  if (!u) return { ok: true, fotos: 0 };

  const tok = u.strava?.accessToken;
  if (tok) await fetch("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { authorization: "Bearer " + tok } }).catch(() => {});

  let fotos: string[] = [];
  await alterarBanco(b => {
    fotos = b.treinos.filter(t => t.uid === uid && t.fotoKey).map(t => t.fotoKey!);
    const phizId = b.usuarios[uid]?.phizId;
    delete b.usuarios[uid];
    b.treinos = b.treinos.filter(t => t.uid !== uid);
    b.tapagos = b.tapagos.filter(t => t.de !== uid && t.para !== uid);
    b.cutucadas = b.cutucadas.filter(c => c.de !== uid && c.para !== uid);
    b.vitorias = b.vitorias.filter(v => v.uid !== uid);
    b.convites = b.convites.filter(c => c.de !== uid && (!phizId || c.paraPhizId !== phizId));
    b.grupos = b.grupos
      .map(g => ({ ...g, membros: g.membros.filter(m => m !== uid) }))
      .filter(g => g.membros.length > 0)
      .map(g => (g.criador === uid ? { ...g, criador: g.membros[0] } : g));
  });

  for (const k of fotos) await apagarFoto(k);

  // Métricas: tira as sessões, envios e eventos da pessoa.
  try {
    const r = await get("tapago/metricas.json", { access: "private", useCache: false });
    if (r && r.statusCode === 200 && r.stream) {
      const m = JSON.parse(await new Response(r.stream).text());
      for (const k of ["sessoes", "envios", "eventos"]) if (Array.isArray(m[k])) m[k] = m[k].filter((x: { uid?: string }) => x.uid !== uid);
      if (m.ultimo) delete m.ultimo[uid];
      await put("tapago/metricas.json", JSON.stringify(m), { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/json", cacheControlMaxAge: 0 });
    }
  } catch (e) { console.error("[apagar-conta] métricas", e); }

  return { ok: true, fotos: fotos.length };
}
