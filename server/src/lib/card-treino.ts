import type { Treino } from "./store";
import { decodificar } from "./arte";
import { nomeDoTipo } from "./tipos";

/**
 * Card do treino sem foto (os do Strava) na timeline, no grupo e no perfil.
 * Cada categoria mostra o número que importa pra ela:
 *   corrida/caminhada/bike → distância (+ ritmo ou velocidade)
 *   natação               → metros (+ ritmo por 100 m)
 *   musculação e o resto  → duração
 * Com trajeto, vai junto o desenho da rota (só a forma, sem mapa: não mostra onde foi).
 */
export type CardTreino = {
  k: string; nome: string; titulo: string;
  v: string; u: string;
  stats: { v: string; r: string }[];
  rota: string;
  /** "Pinheiros · São Paulo" (quando tem trajeto). */
  lugar: string;
  /** Tem trajeto: a rota preenche com a imagem do mapa (urlMapa). */
  temMapa: boolean;
  mapa?: string;
};

const virgula = (n: number, casas = 1) => n.toFixed(casas).replace(".", ",");
const mil = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const tempo = (min: number) => (min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`);
const ritmo = (segPorUnidade: number) => { const s = Math.round(segPorUnidade); return `${Math.floor(s / 60)}'${String(s % 60).padStart(2, "0")}"`; };

/** Trajeto → SVG (traço preto) em data URI, pra <image> do miniapp. */
function rotaSvg(polyline?: string, cor = "#111111"): string {
  if (!polyline) return "";
  let pts: [number, number][];
  try { pts = decodificar(polyline); } catch { return ""; }
  if (pts.length < 2) return "";
  if (pts.length > 160) { const passo = Math.ceil(pts.length / 160); pts = pts.filter((_, i) => i % passo === 0 || i === pts.length - 1); }
  const W = 200, H = 200, M = 14;
  const cos = Math.cos((pts[0][0] * Math.PI) / 180);
  const xs = pts.map(p => p[1] * cos), ys = pts.map(p => -p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const esc = Math.min((W - 2 * M) / Math.max(x1 - x0, 1e-9), (H - 2 * M) / Math.max(y1 - y0, 1e-9));
  const ox = (W - (x1 - x0) * esc) / 2, oy = (H - (y1 - y0) * esc) / 2;
  const P = xs.map((x, i) => [ox + (x - x0) * esc, oy + (ys[i] - y0) * esc]);
  const d = P.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const [fx, fy] = P[P.length - 1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><path d="${d}" fill="none" stroke="${cor}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="7" fill="${cor}"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

export function cardDoTreino(t: Treino, pontos: number): CardTreino {
  const k = t.tipo || "outro";
  const metros = t.distanciaM || 0, km = metros / 1000, seg = (t.min || 0) * 60;
  const pts = { v: "+" + pontos, r: "Pontos" };
  const lugar = t.lugar ? [t.lugar.bairro, t.lugar.cidade].filter(Boolean).join(" · ") : "";
  const base = { k, nome: nomeDoTipo(k), titulo: t.tituloProprio || t.titulo || "", lugar, temMapa: !!t.polyline && !["muscu", "funcional", "luta", "futebol"].includes(k), rota: rotaSvg(t.polyline, ["muscu", "funcional", "luta", "futebol"].includes(k) ? "#C6F432" : "#111111") };

  if ((k === "corrida" || k === "caminhada") && km >= 0.2)
    return { ...base, v: virgula(km, km >= 10 ? 1 : 2), u: "km", stats: [{ v: tempo(t.min), r: "Tempo" }, { v: ritmo(seg / km), r: "Ritmo /km" }, pts] };
  if (k === "bike" && km >= 0.2)
    return { ...base, v: virgula(km), u: "km", stats: [{ v: tempo(t.min), r: "Tempo" }, { v: virgula(km / (seg / 3600)), r: "km/h" }, pts] };
  if (k === "natacao" && metros >= 25)
    return { ...base, v: mil(metros), u: "m", stats: [{ v: tempo(t.min), r: "Tempo" }, { v: ritmo(seg / (metros / 100)), r: "Ritmo /100 m" }, pts] };

  // Musculação e afins: a duração é o número grande; embaixo, o que o relógio mandou (kcal, batimentos).
  const h = t.min >= 60;
  const extra: { v: string; r: string }[] = [];
  if (t.kcal) extra.push({ v: mil(t.kcal), r: "kcal" });
  if (t.fc) extra.push({ v: String(t.fc), r: "bpm médio" });
  if (km >= 0.2) extra.push({ v: virgula(km) + " km", r: "Distância" });
  return {
    ...base,
    v: h ? `${Math.floor(t.min / 60)}h${String(t.min % 60).padStart(2, "0")}` : String(t.min), u: h ? "" : "min",
    stats: [...extra.slice(0, 2), pts],
  };
}
