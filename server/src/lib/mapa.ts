import sharp from "sharp";
import Pbf from "pbf";
import { VectorTile } from "@mapbox/vector-tile";
import { decodificar } from "./arte";

/**
 * Mapa de fundo pros cards e artes de treino com trajeto — desenhado por nós.
 * Dados: tiles vetoriais do OpenFreeMap (OpenStreetMap, grátis, sem chave). Só entram ruas, água,
 * parques e verde; nenhum texto (nem nome de rua). Cores do Tá Pago!.
 * A rota perde as pontas (~250 m de cada lado) pra não entregar onde a pessoa mora.
 */

export type Tema = "claro" | "escuro";
export type Caixa = { x: number; y: number; w: number; h: number };

const UA = "TaPago-PhizChat/1.0 (+https://phizchat-tapago.vercel.app/suporte)";

const CORES = {
  claro: { fundo: "#ECECE7", verde: "#D9E5C3", agua: "#C9DCE6", rua: "#FFFFFF", via: "#FFFFFF" },
  escuro: { fundo: "#141414", verde: "#18200F", agua: "#0D1A22", rua: "#2C2C2C", via: "#3A3A3A" },
};

// Largura das ruas por classe (OpenMapTiles), em px no zoom 15; escala com o zoom.
const LARGURA: Record<string, number> = {
  motorway: 9, trunk: 8, primary: 7, secondary: 6, tertiary: 5, minor: 3.4, service: 2, track: 1.6, path: 1.2,
};

/** Mercator normalizado (0..1). */
function merc(lat: number, lng: number): [number, number] {
  const s = Math.sin((lat * Math.PI) / 180);
  return [(lng + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)];
}

function metros(a: [number, number], b: [number, number]) {
  const R = 6371000, r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r, dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Tira ~250 m do começo e do fim (privacidade). Rota curta demais fica como está. */
export function aparar(pts: [number, number][], corte = 250): [number, number][] {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += metros(pts[i - 1], pts[i]);
  if (total < corte * 4) return pts;
  let ini = 0, fim = pts.length - 1;
  for (let i = 1, d = 0; i < pts.length; i++) { d += metros(pts[i - 1], pts[i]); if (d >= corte) { ini = i; break; } }
  for (let i = pts.length - 1, d = 0; i > 0; i--) { d += metros(pts[i], pts[i - 1]); if (d >= corte) { fim = i; break; } }
  return fim - ini >= 2 ? pts.slice(ini, fim + 1) : pts;
}

let urlTiles: string | null = null;
async function modeloTiles(): Promise<string> {
  if (urlTiles) return urlTiles;
  const r = await fetch("https://tiles.openfreemap.org/planet", { headers: { "user-agent": UA }, signal: AbortSignal.timeout(6000) });
  const j = (await r.json()) as { tiles: string[] };
  urlTiles = j.tiles[0];
  return urlTiles;
}

async function tile(z: number, x: number, y: number): Promise<VectorTile | null> {
  const n = 2 ** z;
  if (y < 0 || y >= n) return null;
  try {
    const u = (await modeloTiles()).replace("{z}", String(z)).replace("{x}", String(((x % n) + n) % n)).replace("{y}", String(y));
    const r = await fetch(u, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return new VectorTile(new Pbf(new Uint8Array(await r.arrayBuffer())));
  } catch { return null; }
}

export type Mapa = { svg: string; pontos: [number, number][]; centro: [number, number] };

/**
 * Desenha o mapa W×H (só o miolo do SVG, sem a tag <svg>) com a rota encaixada na caixa.
 * Devolve também a rota em pixels da imagem, pra quem chama desenhar por cima.
 */
export async function montarMapa(trajeto: string | [number, number][], W: number, H: number, caixa: Caixa, tema: Tema): Promise<Mapa | null> {
  let rota: [number, number][];
  try { rota = typeof trajeto === "string" ? decodificar(trajeto) : trajeto; } catch { return null; }
  if (rota.length < 2) return null;
  rota = aparar(rota);

  const m = rota.map(([la, ln]) => merc(la, ln));
  const xs = m.map(q => q[0]), ys = m.map(q => q[1]);
  const dx = Math.max(Math.max(...xs) - Math.min(...xs), 1e-9), dy = Math.max(Math.max(...ys) - Math.min(...ys), 1e-9);
  // Escala (px por mundo); não passa do zoom 17 (rota pequena não vira um borrão).
  const s = Math.min(caixa.w / dx, caixa.h / dy, 256 * 2 ** 17);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const vx0 = cx - (caixa.x + caixa.w / 2) / s, vy0 = cy - (caixa.y + caixa.h / 2) / s;
  const P = (x: number, y: number): [number, number] => [(x - vx0) * s, (y - vy0) * s];

  // Zoom dos dados: o do desenho (até 14, o máximo do OpenFreeMap); se pedir tile demais, desce.
  const zf = Math.log2(s / 256);
  let dz = Math.max(0, Math.min(14, Math.floor(zf)));
  let tx0 = 0, tx1 = 0, ty0 = 0, ty1 = 0;
  for (;; dz--) {
    const n = 2 ** dz;
    tx0 = Math.floor(vx0 * n); tx1 = Math.floor((vx0 + W / s) * n);
    ty0 = Math.floor(vy0 * n); ty1 = Math.floor((vy0 + H / s) * n);
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) <= 16 || dz === 0) break;
  }
  const n = 2 ** dz;
  const fator = 2 ** (zf - 15); // ruas engrossam/afinam com o zoom
  const c = CORES[tema];

  const pedidos: Promise<[number, number, VectorTile | null]>[] = [];
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) pedidos.push(tile(dz, tx, ty).then(v => [tx, ty, v]));
  const tiles = await Promise.all(pedidos);
  if (!tiles.some(t => t[2])) return null;

  const verde: string[] = [], agua: string[] = [], vias: Record<string, string[]> = {};
  const d = (rings: { x: number; y: number }[][], tx: number, ty: number, ext: number, fechar: boolean) =>
    rings.map(r => r.map((p, i) => { const [X, Y] = P((tx + p.x / ext) / n, (ty + p.y / ext) / n); return (i ? "L" : "M") + X.toFixed(1) + " " + Y.toFixed(1); }).join("") + (fechar ? "Z" : "")).join("");

  for (const [tx, ty, vt] of tiles) {
    if (!vt) continue;
    for (const nome of ["park", "landcover", "landuse"]) {
      const l = vt.layers[nome];
      if (!l) continue;
      for (let i = 0; i < l.length; i++) {
        const f = l.feature(i), cl = String(f.properties.class || "");
        if (nome === "landuse" && !["cemetery", "grass", "recreation_ground", "stadium", "pitch"].includes(cl)) continue;
        if (nome === "landcover" && !["grass", "wood", "forest", "farmland", "wetland"].includes(cl)) continue;
        if (f.type === 3) verde.push(d(f.loadGeometry(), tx, ty, l.extent, true));
      }
    }
    const w = vt.layers.water;
    if (w) for (let i = 0; i < w.length; i++) { const f = w.feature(i); if (f.type === 3) agua.push(d(f.loadGeometry(), tx, ty, w.extent, true)); }
    const t = vt.layers.transportation;
    if (t) for (let i = 0; i < t.length; i++) {
      const f = t.feature(i), cl = String(f.properties.class || "");
      if (f.type !== 2 || !LARGURA[cl] || f.properties.brunnel === "tunnel") continue;
      (vias[cl] ||= []).push(d(f.loadGeometry(), tx, ty, t.extent, false));
    }
  }

  const ordem = ["path", "track", "service", "minor", "tertiary", "secondary", "primary", "trunk", "motorway"];
  const linhas = ordem.filter(k => vias[k]?.length).map(k => {
    const lw = Math.max(0.6, LARGURA[k] * fator);
    const cor = ["motorway", "trunk", "primary", "secondary"].includes(k) ? c.via : c.rua;
    return `<path d="${vias[k].join("")}" fill="none" stroke="${cor}" stroke-width="${lw.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");

  const svg = `<rect width="${W}" height="${H}" fill="${c.fundo}"/>`
    + (verde.length ? `<path d="${verde.join("")}" fill="${c.verde}" fill-rule="evenodd"/>` : "")
    + (agua.length ? `<path d="${agua.join("")}" fill="${c.agua}" fill-rule="evenodd"/>` : "")
    + linhas;

  const meio = rota[Math.floor(rota.length / 2)];
  return { svg, pontos: m.map(([x, y]) => P(x, y)), centro: meio };
}

export const caminhoSvg = (pts: [number, number][]) => pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");

/** Fundo do card do app (1244×712): mapa escuro, sombra do lado do texto, brilho limão no canto e a rota em limão por cima. */
export async function fundoDoCard(trajeto: string | [number, number][]): Promise<Buffer | null> {
  const W = 1244, H = 712;
  const m = await montarMapa(trajeto, W, H, { x: 780, y: 90, w: 400, h: 330 }, "escuro");
  if (!m) return null;
  const d = caminhoSvg(m.pontos);
  const [fx, fy] = m.pontos[m.pontos.length - 1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="e" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#111111" stop-opacity="0.92"/>
        <stop offset="0.38" stop-color="#111111" stop-opacity="0.7"/>
        <stop offset="0.62" stop-color="#111111" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stop-color="#111111" stop-opacity="0"/>
        <stop offset="1" stop-color="#111111" stop-opacity="0.85"/>
      </linearGradient>
      <radialGradient id="l" cx="${W}" cy="${H}" r="${Math.round(W * 0.75)}" gradientUnits="userSpaceOnUse" gradientTransform="translate(${W} ${H}) scale(1 ${((H * 1.15) / (W * 0.75)).toFixed(3)}) translate(${-W} ${-H})">
        <stop offset="0" stop-color="#C6F432" stop-opacity="0.8"/>
        <stop offset="0.3" stop-color="#C6F432" stop-opacity="0.38"/>
        <stop offset="0.62" stop-color="#C6F432" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#C6F432" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${m.svg}
    <rect width="${W}" height="${H}" fill="url(#e)"/>
    <rect width="${W}" height="${H}" fill="url(#b)"/>
    <rect width="${W}" height="${H}" fill="url(#l)"/>
    <path d="${d}" fill="none" stroke="#C6F432" stroke-opacity="0.22" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#C6F432" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="13" fill="#C6F432" stroke="#111111" stroke-width="6"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}

/** Mapa escuro pra arte de post (1080×1350), com a rota em pixels da arte (a arte desenha a rota). */
export async function mapaDaArte(trajeto: string | [number, number][]): Promise<{ img: string; pontos: [number, number][] } | null> {
  const W = 1080, H = 1350;
  const m = await montarMapa(trajeto, W, H, { x: 90, y: 260, w: 640, h: 520 }, "escuro");
  if (!m) return null;
  const jpg = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${m.svg}</svg>`)).jpeg({ quality: 84 }).toBuffer();
  return { img: "data:image/jpeg;base64," + jpg.toString("base64"), pontos: m.pontos };
}

/** Mini mapa (260×260) pra arte com foto: a rota num quadradinho no canto. */
export async function miniMapa(trajeto: string | [number, number][]): Promise<string | null> {
  const S = 520;
  const m = await montarMapa(trajeto, S, S, { x: 70, y: 70, w: 380, h: 380 }, "escuro");
  if (!m) return null;
  const d = caminhoSvg(m.pontos);
  const jpg = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${m.svg}<path d="${d}" fill="none" stroke="#C6F432" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>`)).jpeg({ quality: 84 }).toBuffer();
  return "data:image/jpeg;base64," + jpg.toString("base64");
}

/** Bairro e cidade do meio da rota (Nominatim/OSM, grátis, 1 pedido por treino e fica guardado). */
export async function lugarDe(lat: number, lng: number): Promise<{ bairro: string; cidade: string } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=14&accept-language=pt-BR&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`,
      { headers: { "user-agent": UA }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { address?: Record<string, string> };
    const a = j.address || {};
    return { bairro: a.suburb || a.neighbourhood || a.city_district || a.quarter || "", cidade: a.city || a.town || a.village || a.municipality || "" };
  } catch { return null; }
}
