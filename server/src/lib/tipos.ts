export const TIPOS: Array<[string, string]> = [
  ["funcional", "Funcional"], ["muscu", "Musculação"], ["corrida", "Corrida"], ["caminhada", "Caminhada"],
  ["bike", "Bike"], ["yoga", "Yoga"], ["natacao", "Natação"], ["luta", "Luta"], ["futebol", "Futebol"], ["outro", "Outro"],
];

export const nomeDoTipo = (k: string) => (TIPOS.find(t => t[0] === k) || [k, "Treino"])[1];

/** Treino à mão conta até 90 min por dia; registro aceita de 10 a 180. */
export const MANUAL_MAX_DIA = 90;
export const MIN_MIN = 10;
export const MIN_MAX = 180;
/** Treinos à mão por dia (o 3º é recusado). */
export const MANUAL_POR_DIA = 2;
/** Distância à mão: só nestes tipos, de 0,5 a 100 km; conta até 20 km por dia. */
export const TIPOS_COM_KM = ["corrida", "caminhada", "bike", "natacao"];
export const KM_MANUAL_MAX_DIA = 20;
export const KM_MAX = 100;

/**
 * Pontos Tá Pago! (ranking geral do app). Por dia:
 *   10 por ter treinado + 1 a cada 5 min (até 120 min) + 1 por km (até 20 km).
 * Máximo de 54 por dia: quem treina todo dia ganha de quem faz um treino gigante.
 */
export const PONTOS = { dia: 10, cadaMin: 5, minMax: 120, kmMax: 20 };

export type Metrica = "pontos" | "dias" | "duracao" | "distancia";
export const METRICAS: Metrica[] = ["dias", "duracao", "distancia"];
export type Periodo = "hoje" | "semana" | "mes" | "total";

export const FOTO_MAX_BYTES = 10 * 1024 * 1024;

/** Dia em São Paulo (YYYY-MM-DD). */
export function diaSP(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Segunda-feira da semana do dia (YYYY-MM-DD). */
export function segundaDe(dia: string): string {
  const [y, m, d] = dia.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

export const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("") || "?";

/** Cor estável do avatar de letras. */
export function corDe(id: string): string {
  const cores = ["#538FA6", "#7A8C99", "#B08968", "#6A8D73", "#8A6FB0", "#C0785A", "#4F7CAC", "#9C6B8E"];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return cores[h % cores.length];
}
