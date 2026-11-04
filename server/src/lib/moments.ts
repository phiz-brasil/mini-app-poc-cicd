import sharp from "sharp";
import { arteFrame, FRAMES, type DadosFrame, type Frame } from "./arte-frame";
import { arteMomento } from "./arte";
import { dadosDaArte } from "./arte-dados";
import { artePodio } from "./arte-podio";
import { arteCampeao } from "./arte-campeao";
import { dadosCampeao, podioDe } from "./domingo";
import { publicarArte } from "./destaques";
import { alterarBanco, lerBanco, lerFotoBytes, salvarFoto, type Banco } from "./store";
import { pontosDoDia } from "./ranking";
import { diaSP, nomeDoTipo } from "./tipos";
import { ErroAcao, novoId } from "./acoes";

/**
 * Moments: tudo que a pessoa pode postar, pronto.
 *   · foto nova com um frame do Tá Pago! (selo, faixa ou moldura)
 *   · arte de um treino que ela já fez
 *   · pódio da semana (geral e grupos) e as artes de campeão
 * O post sai pela conta Tá Pago! (OpenAPI). Enquanto ela não estiver liberada,
 * o app oferece salvar a imagem e mandar no chat.
 */
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const quando = (dia: string) => { const d = new Date(dia + "T12:00:00Z"); return `${DIAS[d.getUTCDay()]}, ${d.getUTCDate()} ${MESES[d.getUTCMonth()]}`; };

export const chaveFrame = (uid: string, id: string) => `tapago/frames/${uid}/${id}.jpg`;

/** Guarda a foto (até 1350 px, JPG) e devolve o id pra montar os frames. */
export async function guardarFotoFrame(uid: string, dados: ArrayBuffer): Promise<string> {
  if (dados.byteLength > 10 * 1024 * 1024) throw new ErroAcao("Foto grande demais (máx. 10 MB).");
  // Até 20 fotos de moldura por dia por pessoa (guarda no Blob: evita abuso de espaço).
  const dia = diaSP();
  await alterarBanco(b => {
    const u = b.usuarios[uid];
    if (!u) throw new ErroAcao("Usuário não encontrado.", 404);
    const m = u.molduras && u.molduras.dia === dia ? u.molduras : { dia, n: 0 };
    if (m.n >= 20) throw new ErroAcao("Chega de fotos por hoje 😅 Amanhã tem mais.");
    u.molduras = { dia, n: m.n + 1 };
  });
  const jpg = await sharp(Buffer.from(dados)).rotate().resize(1350, 1350, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const id = novoId();
  await salvarFoto(chaveFrame(uid, id), jpg.buffer.slice(jpg.byteOffset, jpg.byteOffset + jpg.byteLength) as ArrayBuffer, "image/jpeg");
  return id;
}

export async function dadosFrame(b: Banco, uid: string, id: string): Promise<DadosFrame | null> {
  const f = await lerFotoBytes(chaveFrame(uid, id));
  const u = b.usuarios[uid];
  if (!f || !u) return null;
  const dia = diaSP();
  const hoje = b.treinos.filter(t => t.uid === uid && t.dia === dia && !t.pendenteFoto);
  return {
    foto: `data:${f.tipo};base64,` + Buffer.from(f.dados).toString("base64"), quando: quando(dia), nome: u.nome,
    treino: hoje.length ? [...new Set(hoje.map(t => nomeDoTipo(t.tipo)))].join(" + ") : undefined,
    min: hoje.reduce((a, t) => a + t.min, 0) || undefined, pontos: pontosDoDia(hoje) || undefined,
  };
}

export const ehFrame = (f: string): f is Frame => (FRAMES as string[]).includes(f);

/** Monta o PNG do que a pessoa escolheu postar. */
async function png(b: Banco, uid: string, p: { tipo: string; id?: string; frame?: string; chave?: string }): Promise<{ png: Buffer; texto: string }> {
  const u = b.usuarios[uid];
  if (!u) throw new ErroAcao("Usuário não encontrado.", 404);
  const primeiro = u.nome.split(" ")[0];
  let img;
  let texto = `${primeiro} no Tá Pago! 💪 #TaPago`;
  if (p.tipo === "frame" && p.id && p.frame && ehFrame(p.frame)) {
    const d = await dadosFrame(b, uid, p.id);
    if (!d) throw new ErroAcao("Foto não encontrada.", 404);
    img = await arteFrame(p.frame, d);
    texto = `Tá pago! ✅ ${d.treino ? d.treino + " hoje. " : ""}#TaPago`;
  } else if (p.tipo === "treino" && p.id) {
    const t = b.treinos.find(x => x.id === p.id && x.uid === uid);
    if (!t) throw new ErroAcao("Treino não encontrado.", 404);
    img = await arteMomento(await dadosDaArte(b, t, u));
    texto = `Tá pago! ✅ ${primeiro} fez ${t.min} min de ${nomeDoTipo(t.tipo).toLowerCase()}. #TaPago`;
  } else if (p.tipo === "podio" && p.chave) {
    const d = podioDe(b, p.chave, uid);
    if (!d || !d.top.length) throw new ErroAcao("Ninguém treinou nessa semana ainda.");
    img = await artePodio(d);
    texto = `🏆 Pódio da semana no ${d.titulo}. #TaPago`;
  } else if (p.tipo === "campeao" && p.id) {
    const d = dadosCampeao(b, p.id);
    if (!d || b.vitorias.find(v => v.id === p.id)?.uid !== uid) throw new ErroAcao("Vitória não encontrada.", 404);
    img = await arteCampeao(d);
    texto = `🏆 ${primeiro} venceu a semana no ${d.titulo}! #TaPago`;
  } else {
    throw new ErroAcao("Escolha o que postar.");
  }
  return { png: Buffer.from(await img.arrayBuffer()), texto };
}

export async function postarNoMoments(uid: string, p: { tipo: string; id?: string; frame?: string; chave?: string }) {
  const b = await lerBanco();
  const { png: imagem, texto } = await png(b, uid, p);
  const r = await publicarArte(imagem, texto, `tp-${p.tipo}-${p.id || p.chave}-${p.frame || ""}-${Date.now().toString(36)}`.slice(0, 64));
  return { momento: r.status };
}

/** O que mostrar na página Moments. */
export function listaMoments(b: Banco, uid: string) {
  const treinos = b.treinos
    .filter(t => t.uid === uid && !t.pendenteFoto)
    .sort((a, c) => c.criadoEm.localeCompare(a.criadoEm)).slice(0, 10)
    .map(t => ({ id: t.id, titulo: t.titulo || nomeDoTipo(t.tipo), quando: quando(t.dia), min: t.min }));
  const chaves = ["geral", ...b.grupos.filter(g => g.membros.includes(uid) && g.membros.length >= 2).map(g => g.id)];
  const podios = chaves.map(c => { const d = podioDe(b, c, uid); return d && d.top.length ? { chave: c, titulo: d.titulo } : null; }).filter(Boolean) as { chave: string; titulo: string }[];
  const campeoes = b.vitorias.filter(v => v.uid === uid).sort((a, c) => c.semana.localeCompare(a.semana)).slice(0, 6).map(v => ({ id: v.id, titulo: v.titulo }));
  return { treinos, podios, campeoes };
}
