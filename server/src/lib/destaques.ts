import { arteMomento } from "./arte";
import { lerBanco } from "./store";
import { dadosDaArte } from "./arte-dados";
import { objectKeyDe, openapiConfigurada, pedirUpload, publicarMomentos, roboDoApp, subir } from "./phiz-openapi";
import type { Destaque, Treino, Usuario } from "./store";
import { nomeDoTipo } from "./tipos";

/** O treino vira a arte do Momento (lib/arte.tsx): foto, foto do Strava ou trajeto, e os números. */
async function montarArte(t: Treino, u: Usuario, foto?: ArrayBuffer): Promise<Buffer> {
  const img = await arteMomento(await dadosDaArte(await lerBanco(), t, u, foto));
  return Buffer.from(await img.arrayBuffer());
}

/**
 * Destaque = a conta oficial Tá Pago! (robô da OpenAPI) posta o treino de quem
 * deu opt-in nos Momentos, com a arte do treino (foto + números). Nunca bloqueia o registro:
 * se falhar, o treino continua valendo e o status fica gravado.
 *
 * Clipes ficam de fora por enquanto (sem vídeo/Meishe).
 */
export async function publicarDestaque(t: Treino, u: Usuario, foto?: { dados: ArrayBuffer; tipo: string; nome: string }): Promise<Destaque> {
  const em = new Date().toISOString();
  if (!openapiConfigurada()) return { status: "sem-config", em };
  const requestNo = "tp-" + t.id;
  try {
    const robotId = await roboDoApp();
    const png = await montarArte(t, u, foto?.dados);
    const p = await pedirUpload({ module: "moments", mediaType: "image", fileName: "treino-" + t.id + ".png", fileSize: png.byteLength });
    await subir(p.uploadUrl, p.uploadHeaders, png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer);
    const okey = objectKeyDe(p.downloadUrl);
    const texto = `Tá pago de hoje 🔥 ${u.nome} fez ${t.min} min de ${nomeDoTipo(t.tipo).toLowerCase()}. Quem mais treinou hoje? #TaPago`;
    const r = await publicarMomentos(requestNo, [{
      robotId,
      content: texto,
      type: Number(process.env.PHIZ_MOMENT_TYPE || 1),
      submitId: t.id,
      mediaList: [{
        type: Number(process.env.PHIZ_MOMENT_MEDIA_TYPE_IMAGE || 1),
        okey, tkey: okey, size: png.byteLength,
        width: 1080, height: 1350, length: 0,
      }],
    }]);
    if (r.successCount > 0) return { status: "publicado", requestNo, em };
    return { status: "falhou", requestNo, erro: r.failedItems?.[0]?.errorMessage || "Recusado pelo serviço de Momentos.", em };
  } catch (e) {
    return { status: "falhou", requestNo, erro: e instanceof Error ? e.message : String(e), em };
  }
}

/** Posta uma arte pronta (PNG) nos Momentos pela conta Tá Pago! (ex.: campeão da semana). */
export async function publicarArte(png: Buffer, texto: string, requestNo: string): Promise<Destaque> {
  const em = new Date().toISOString();
  if (!openapiConfigurada()) return { status: "sem-config", em };
  try {
    const robotId = await roboDoApp();
    const p = await pedirUpload({ module: "moments", mediaType: "image", fileName: requestNo + ".png", fileSize: png.byteLength });
    await subir(p.uploadUrl, p.uploadHeaders, png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer);
    const okey = objectKeyDe(p.downloadUrl);
    const r = await publicarMomentos(requestNo, [{
      robotId, content: texto, type: Number(process.env.PHIZ_MOMENT_TYPE || 1), submitId: requestNo,
      mediaList: [{ type: Number(process.env.PHIZ_MOMENT_MEDIA_TYPE_IMAGE || 1), okey, tkey: okey, size: png.byteLength, width: 1080, height: 1350, length: 0 }],
    }]);
    if (r.successCount > 0) return { status: "publicado", requestNo, em };
    return { status: "falhou", requestNo, erro: r.failedItems?.[0]?.errorMessage || "Recusado pelo serviço de Momentos.", em };
  } catch (e) {
    return { status: "falhou", requestNo, erro: e instanceof Error ? e.message : String(e), em };
  }
}
