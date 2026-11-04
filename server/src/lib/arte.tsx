import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A arte do Momento que a conta Tá Pago! posta (1080×1350, 4:5): a foto do
 * treino num cartão arredondado e os números embaixo. Clipes ficam de fora
 * por enquanto (sem vídeo/Meishe).
 */

export type DadosArte = {
  nome: string; foto?: string | null; min: number; tipo: string; km?: number;
  pos?: number; total?: number; seq?: number; pontos?: number; quando: string;
  /** Trajeto (lat, lng) do Strava: sem foto, a arte desenha o caminho. */
  rota?: [number, number][];
  /** Mapa escuro sem nomes de rua (montado em lib/mapa) e a rota já em pixels da arte. */
  mapa?: { img: string; pontos: [number, number][] } | null;
  /** Com foto: mini mapa da rota no canto. */
  miniMapa?: string | null;
  /** "Vila Mariana · São Paulo". */
  lugar?: string;
  /** Nome do treino (o do Strava, ex. "Bike SP"). */
  titulo?: string;
  /** Veio do Strava: a arte leva o selo "Powered by Strava" (regra de marca). */
  strava?: boolean;
};

/** Polyline do Google (a do Strava) → pontos [lat, lng]. */
export function decodificar(p: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < p.length) {
    for (const k of [0, 1]) {
      let r = 0, s = 0, c: number;
      do { c = p.charCodeAt(i++) - 63; r |= (c & 0x1f) << s; s += 5; } while (c >= 0x20 && i < p.length);
      const d = r & 1 ? ~(r >> 1) : r >> 1;
      if (k === 0) lat += d; else lng += d;
    }
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

/** Desenho do trajeto no espaço w×h (mantém a proporção, com margem). */
function caminho(rota: [number, number][], w: number, h: number, m: number): { d: string; ini: [number, number]; fim: [number, number] } {
  const cos = Math.cos((rota[0][0] * Math.PI) / 180);
  const xs = rota.map(p => p[1] * cos), ys = rota.map(p => -p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const esc = Math.min((w - 2 * m) / Math.max(x1 - x0, 1e-9), (h - 2 * m) / Math.max(y1 - y0, 1e-9));
  const ox = (w - (x1 - x0) * esc) / 2, oy = (h - (y1 - y0) * esc) / 2;
  const P = xs.map((x, i) => [ox + (x - x0) * esc, oy + (ys[i] - y0) * esc] as [number, number]);
  return { d: P.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" "), ini: P[0], fim: P[P.length - 1] };
}

const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));
const LIMAO = "#C6F432";

const ROTULO = { fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" as const };

/**
 * Três jeitos, conforme o que o treino tem:
 *   foto    — foto cheia, degradê escuro embaixo, letras brancas, selo limão.
 *   trajeto — fundo preto com o caminho em limão.
 *   nada    — fundo limão com o número gigante.
 * Em todos: logo no topo, nome do treino grande, faixa de números e o selo "TÁ PAGO!".
 */
export async function arteMomento(d: DadosArte): Promise<ImageResponse> {
  const [unb, i5, i7, logoBranco, logoPreto, stBranco, stPreto] = await Promise.all([
    A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo3-branco.svg"), A("logo3-preto.svg"), A("strava-powered-branco.svg"), A("strava-powered-preto.svg"),
  ]);
  const svg = (b: Buffer) => "data:image/svg+xml;base64," + b.toString("base64");
  const W = 1080, H = 1350, M = 72, LW = W - M * 2;
  const modo: "foto" | "trajeto" | "nada" = d.foto ? "foto" : d.rota && d.rota.length > 1 ? "trajeto" : "nada";
  const claro = modo === "nada";
  const tinta = claro ? "#111111" : "#FFFFFF";
  const realce = claro ? "#111111" : LIMAO;
  const apoio = claro ? "rgba(17,17,17,0.62)" : "rgba(255,255,255,0.72)";
  const primeiro = d.nome.split(" ")[0];
  const titulo = (d.titulo || `Treino de ${d.tipo.toLowerCase()}`).toUpperCase();
  const tamTit = titulo.length <= 12 ? 104 : titulo.length <= 20 ? 84 : 66;

  // No modo limão os minutos já são o número gigante: a faixa começa pela distância.
  const numeros: { v: string; u: string; r: string }[] = modo === "nada" ? [] : [{ v: String(d.min), u: "min", r: "Tempo" }];
  if (d.km) numeros.push({ v: String(d.km).replace(".", ","), u: "km", r: "Distância" });
  if (d.pontos) numeros.push({ v: "+" + d.pontos, u: "pts", r: "Pontos" });
  if (numeros.length < 3 && d.seq) numeros.push({ v: String(d.seq), u: d.seq === 1 ? "dia" : "dias", r: "Sequência" });
  if (numeros.length < 3 && d.pos) numeros.push({ v: d.pos + "º", u: "", r: "Hoje" });

  let fundo;
  if (modo === "foto") {
    fundo = <>
      <img src={d.foto!} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 300, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: W, height: 820, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.78) 48%, rgba(0,0,0,0.92) 100%)" }} />
    </>;
  } else if (modo === "trajeto" && d.mapa) {
    const pd = d.mapa.pontos.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" ");
    const fim = d.mapa.pontos[d.mapa.pontos.length - 1];
    fundo = <>
      <img src={d.mapa.img} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 280, display: "flex", background: "linear-gradient(180deg, rgba(14,14,14,0.85) 0%, rgba(14,14,14,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, top: H - 620, width: W, height: 620, display: "flex", background: "linear-gradient(180deg, rgba(14,14,14,0) 0%, rgba(14,14,14,0.8) 45%, rgba(14,14,14,0.95) 100%)" }} />
      <div style={{ position: "absolute", left: W - 700, top: H - 700, width: 700, height: 700, display: "flex", background: "radial-gradient(circle at 100% 100%, rgba(252,82,0,0.45) 0%, rgba(252,82,0,0) 65%)" }} />
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={pd} fill="none" stroke="rgba(198,244,50,0.28)" strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pd} fill="none" stroke={LIMAO} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={fim[0]} cy={fim[1]} r={22} fill={LIMAO} stroke="#111111" strokeWidth={8} />
      </svg>
      {d.lugar ? <div style={{ position: "absolute", left: M, top: 168, display: "flex", ...ROTULO, fontSize: 24, color: "rgba(255,255,255,0.72)" }}>{d.lugar}</div> : null}
    </>;
  } else if (modo === "trajeto") {
    const c = caminho(d.rota!, W, 760, 150);
    fundo = <>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", background: "#111111" }} />
      <svg width={W} height={760} viewBox={`0 0 ${W} 760`} style={{ position: "absolute", left: 0, top: 110 }}>
        <path d={c.d} fill="none" stroke="rgba(198,244,50,0.25)" strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" />
        <path d={c.d} fill="none" stroke={LIMAO} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={c.ini[0]} cy={c.ini[1]} r={20} fill="#FFFFFF" />
        <circle cx={c.fim[0]} cy={c.fim[1]} r={22} fill={LIMAO} stroke="#111111" strokeWidth={8} />
      </svg>
    </>;
  } else {
    fundo = <>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", background: LIMAO }} />
      <div style={{ position: "absolute", left: M, top: 200, display: "flex", ...ROTULO, fontSize: 26, color: "rgba(17,17,17,0.62)" }}>Minutos de treino</div>
      <div style={{ position: "absolute", left: M - 16, top: 220, display: "flex", fontFamily: "Unbounded", fontSize: 540, lineHeight: 1, letterSpacing: -40, color: "#111111" }}>{d.min}</div>
    </>;
  }

  const corpo = <>
    {fundo}
    {/* topo: logo + data */}
    <div style={{ position: "absolute", left: M, top: 72, width: LW, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <img src={svg(claro ? logoPreto : logoBranco)} width={354} height={70} style={{ width: 354, height: 70 }} />
      <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, fontSize: 28, fontWeight: 700, whiteSpace: "nowrap",
        background: claro ? "#111111" : "rgba(255,255,255,0.16)", color: "#FFFFFF" }}>{d.quando}</div>
    </div>

    {/* com foto: mini mapa da rota no canto */}
    {modo === "foto" && d.miniMapa ? <img src={d.miniMapa} width={260} height={260} style={{ position: "absolute", left: W - M - 260, top: 168, width: 260, height: 260, borderRadius: 36, border: "4px solid rgba(255,255,255,0.85)" }} /> : null}

    {/* selo */}
    <div style={{ position: "absolute", left: W - 70 - 230, top: modo === "foto" ? 500 : 600, width: 230, height: 230, borderRadius: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: claro ? "#111111" : LIMAO, transform: "rotate(-14deg)", border: `8px solid ${claro ? LIMAO : "#111111"}` }}>
      <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 40, color: claro ? LIMAO : "#111111", letterSpacing: -1 }}>TÁ</div>
      <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 46, color: claro ? LIMAO : "#111111", letterSpacing: -1, marginTop: -6 }}>PAGO!</div>
    </div>

    {/* "Powered by Strava" (regra de marca do Strava) no canto de baixo */}
    {d.strava ? <img src={svg(claro ? stPreto : stBranco)} width={240} height={24} style={{ position: "absolute", left: W - M - 240, bottom: 26, width: 240, height: 24 }} /> : null}
    {/* embaixo: quem, nome do treino, números */}
    <div style={{ position: "absolute", left: M, bottom: 72, width: LW, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", ...ROTULO, color: realce }}>{primeiro} · {d.tipo}</div>
      <div style={{ display: "flex", flexWrap: "wrap", width: LW, marginTop: 14, fontFamily: "Unbounded", fontSize: tamTit, lineHeight: 1.02, letterSpacing: -3, color: tinta }}>{titulo}</div>
      <div style={{ display: "flex", width: LW, marginTop: 40, paddingTop: 32, borderTop: `3px solid ${claro ? "rgba(17,17,17,0.18)" : "rgba(255,255,255,0.22)"}` }}>
        {numeros.slice(0, 3).map((n, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", width: LW / 3, paddingLeft: i ? 28 : 0, borderLeft: i ? `3px solid ${claro ? "rgba(17,17,17,0.18)" : "rgba(255,255,255,0.22)"}` : "none" }}>
            <div style={{ display: "flex", ...ROTULO, fontSize: 22, color: apoio }}>{n.r}</div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
              <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 76, lineHeight: 1, letterSpacing: -3, color: tinta }}>{n.v}</div>
              {n.u ? <div style={{ display: "flex", marginLeft: 8, marginBottom: 8, fontSize: 30, fontWeight: 700, color: apoio }}>{n.u}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  </>;

  return new ImageResponse(
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: "#111111", fontFamily: "Inter", overflow: "hidden" }}>{corpo}</div>,
    { width: W, height: H, fonts: [
      { name: "Unbounded", data: unb, weight: 800, style: "normal" },
      { name: "Inter", data: i5, weight: 500, style: "normal" },
      { name: "Inter", data: i7, weight: 700, style: "normal" },
    ] },
  );
}
