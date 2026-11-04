import { mapaDaArte, miniMapa } from "./mapa";
import sharp from "sharp";
import { decodificar, type DadosArte } from "./arte";
import { lerFotoBytes, type Banco, type Treino, type Usuario } from "./store";
import { pontosDoDia, rankingDoDia, sequencia } from "./ranking";
import { nomeDoTipo } from "./tipos";

const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

async function comoDataUrl(dados: ArrayBuffer | Buffer): Promise<string> {
  const jpg = await sharp(Buffer.from(dados as ArrayBuffer)).rotate().resize(1000, 1000, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return "data:image/jpeg;base64," + jpg.toString("base64");
}

/**
 * O que vai na arte de um treino. Imagem, nesta ordem: foto do app → foto do
 * Strava → trajeto do Strava → só o tipo em letras grandes.
 */
export async function dadosDaArte(b: Banco, t: Treino, u: Usuario, fotoBytes?: ArrayBuffer): Promise<DadosArte> {
  let foto: string | null = null;
  try {
    if (fotoBytes) foto = await comoDataUrl(fotoBytes);
    else if (t.fotoKey) { const f = await lerFotoBytes(t.fotoKey); if (f) foto = await comoDataUrl(f.dados); }
    else if (t.fotoExterna) {
      const r = await fetch(t.fotoExterna, { signal: AbortSignal.timeout(8000) });
      if (r.ok) foto = await comoDataUrl(await r.arrayBuffer());
    }
  } catch { foto = null; }
  const hoje = rankingDoDia(b, t.dia, u.id);
  const pos = hoje.findIndex(r => r.uid === u.id) + 1;
  const d = new Date(t.dia + "T12:00:00Z");
  return {
    nome: u.nome, foto, min: t.min, tipo: nomeDoTipo(t.tipo), titulo: t.titulo, strava: t.fonte === "strava",
    km: t.distanciaM ? Math.round(t.distanciaM / 100) / 10 : undefined,
    pos: pos > 0 && !t.pendenteFoto ? pos : undefined, seq: sequencia(b, u.id, t.dia),
    pontos: pontosDoDia(b.treinos.filter(x => x.uid === u.id && x.dia === t.dia && !x.pendenteFoto)) || undefined,
    quando: `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`,
    rota: t.polyline ? decodificar(t.polyline) : undefined,
    mapa: t.polyline && !foto ? await mapaDaArte(t.polyline) : undefined,
    miniMapa: t.polyline && foto ? await miniMapa(t.polyline) : undefined,
    lugar: t.lugar ? [t.lugar.bairro, t.lugar.cidade].filter(Boolean).join(" · ") : undefined,
  };
}
