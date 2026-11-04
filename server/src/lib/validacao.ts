import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { nomeDoTipo } from "./tipos";

/**
 * Antifraude do treino à mão (critério exigente desde a 1.0: precisa de PROVA de treino). Duas camadas:
 *
 *   1. Sem IA: assinatura da imagem (dHash 8×8). Foto quase igual a uma das
 *      últimas da pessoa vira "dúvida" (mesma academia todo dia é normal, por
 *      isso não recusa sozinha).
 *   2. Claude olhando a foto: é treino de verdade, agora? Tela, print, foto de
 *      foto, comida, mesa → recusa com o motivo, e a pessoa tira outra.
 *
 * Sem ANTHROPIC_API_KEY o treino entra como "pendente" (conta normal) — a IA
 * nunca derruba o registro: se a chamada falhar, também entra como pendente.
 */

export type Validacao = {
  status: "ok" | "duvida" | "recusada" | "pendente";
  motivo?: string;
  /** Título engraçado pro aviso da foto recusada ("Esse treino tá fofo demais"). */
  titulo?: string;
  tipoProvavel?: string;
  hash?: string;
  em: string;
};

const MODELO = "claude-opus-5-5";

const SCHEMA = {
  type: "object",
  properties: {
    veredito: { type: "string", enum: ["ok", "duvida", "recusada"] },
    motivo: { type: "string", description: "Uma frase curta em português, falando com a pessoa." },
    titulo: { type: "string", description: "Só quando recusada ou duvida: uma zoeira curta (até 6 palavras) sobre o que a foto mostra. Senão, vazio." },
    tipo_provavel: { type: "string", description: "Atividade que a foto mostra, ou vazio." },
  },
  required: ["veredito", "motivo", "titulo", "tipo_provavel"],
  additionalProperties: false,
} as const;

const SISTEMA = `Você é o juiz das fotos de treino do Tá Pago!, um ranking de treino entre amigos no PhizChat.
A pessoa tirou a foto AGORA, pela câmera do app (galeria não é permitida), pra provar que treinou e ganhar pontos.
Seja exigente: foto que não prova treino tira ponto de quem treinou de verdade. Mas não seja injusto com quem treinou.

Procure PROVAS de treino (precisa de pelo menos uma, clara):
- roupa de treino em uso (legging, top, regata/camiseta esportiva, short de corrida, tênis de treino, kimono, luva de boxe)
- suor, rosto corado, cabelo molhado de esforço
- equipamento em uso ou ao alcance: anilha, halter, barra, máquina, esteira, bike, colchonete, kettlebell, saco de pancada
- ambiente de treino: academia, box de crossfit, quadra, campo, pista, piscina, trilha, ciclovia, estúdio de yoga/pilates
- relógio esportivo ou painel de esteira/bike mostrando o treino (tempo, distância, frequência)
- durante uma corrida/pedal/caminhada ao ar livre (roupa esportiva, rua/parque, movimento)

ok: tem prova clara E combina com o treino declarado (ex.: declarou musculação e está na academia com roupa de treino).
duvida: tem algum indício, mas fraco ou que não combina com o treino declarado (ex.: roupa de treino em casa sem nada
mais, foto muito escura ou desfocada, só o chão/parede da academia, declarou corrida e a foto é de academia).
recusada: nenhuma prova de treino. Exemplos: roupa do dia a dia em casa, no sofá, na cama, no trabalho, no carro,
no restaurante; selfie comum; paisagem sem atividade; comida; pet; tela de computador/celular/TV (exceto relógio
ou aparelho de treino); print, foto de foto ou imagem da internet; foto toda preta ou branca; documento.

Não descreva nem julgue o corpo ou a aparência de ninguém — avalie só se há prova de treino.
O motivo é uma frase curta e gentil em português do Brasil dizendo o que faltou (ex.: "Não deu pra ver o treino
nessa foto, tira uma na academia ou com a roupa de treino?").
O titulo (só quando recusada ou duvida) é uma zoeira de amigo de academia, curta e engraçada, sobre o que a foto
mostra. Exemplos: "Teclado não conta como supino", "Esse treino tá fofo demais", "Treino de sofá não vale",
"Cadê o suor nessa foto?", "Isso é lanche, não é treino". Nunca zoe o corpo ou a aparência de ninguém.`;

let cliente: Anthropic | null = null;
const ia = () => (process.env.ANTHROPIC_API_KEY ? (cliente ??= new Anthropic()) : null);

/** dHash 8×8 em hex: 64 bits que mudam pouco entre fotos quase iguais. */
async function assinatura(img: Buffer): Promise<string> {
  const px = await sharp(img).rotate().greyscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
  let bits = "";
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += px[y * 9 + x] > px[y * 9 + x + 1] ? "1" : "0";
  return bits.match(/.{4}/g)!.map(q => parseInt(q, 2).toString(16)).join("");
}

export function distancia(a: string, b: string): number {
  let n = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { n += x & 1; x >>= 1; }
  }
  return n;
}

export async function validarFoto(
  dados: ArrayBuffer,
  p: { tipo: string; min: number; hashesAnteriores: string[] },
): Promise<Validacao> {
  const em = new Date().toISOString();
  const img = Buffer.from(dados);
  const hash = await assinatura(img).catch(() => undefined);
  const repetida = !!hash && p.hashesAnteriores.some(h => distancia(h, hash) <= 4);

  const c = ia();
  if (!c) return { status: repetida ? "duvida" : "pendente", motivo: repetida ? "Foto muito parecida com uma anterior." : undefined, hash, em };

  try {
    // 1024 px no lado maior: suficiente pra ver a cena e bem mais barato.
    const jpg = await sharp(img).rotate().resize(1024, 1024, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    const r = await c.beta.messages.create({
      model: MODELO,
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      system: SISTEMA,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpg.toString("base64") } },
          { type: "text", text: `Treino declarado: ${nomeDoTipo(p.tipo)}, ${p.min} min.` },
        ],
      }],
    });
    if (r.stop_reason === "refusal") return { status: "pendente", hash, em };
    const txt = r.content.flatMap(b => (b.type === "text" ? [b.text] : [])).join("");
    const j = JSON.parse(txt) as { veredito: "ok" | "duvida" | "recusada"; motivo: string; titulo: string; tipo_provavel: string };
    const status = j.veredito === "ok" && repetida ? "duvida" : j.veredito;
    return { status, motivo: j.motivo || undefined, titulo: j.titulo || undefined, tipoProvavel: j.tipo_provavel || undefined, hash, em };
  } catch (e) {
    console.error("[validacao]", e instanceof Error ? e.message : e);
    return { status: repetida ? "duvida" : "pendente", hash, em };
  }
}
