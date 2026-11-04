import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Arte do resumo de domingo: o pódio da semana (1080×1350).
 * Fundo preto, 1º lugar num bloco limão, logo no topo e o nome do grupo grande.
 */
export type DadosPodio = {
  titulo: string;           // nome do grupo ou "Ranking geral"
  semana: string;           // "13 a 19 out"
  top: { nome: string; avatar?: string; valor: string; un: string; eu?: boolean }[];
  eu?: { pos: number; total: number; valor: string; un: string };
};

const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));
const L = "#C6F432";

async function foto(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return `data:${r.headers.get("content-type") || "image/jpeg"};base64,` + Buffer.from(await r.arrayBuffer()).toString("base64");
  } catch { return null; }
}

export async function artePodio(d: DadosPodio): Promise<ImageResponse> {
  const [unb, i5, i7, logo] = await Promise.all([A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo3-branco.svg")]);
  const W = 1080, H = 1350, M = 72;
  const fotos = await Promise.all(d.top.map(t => foto(t.avatar)));
  const ordem = [1, 0, 2].filter(i => d.top[i]);
  const alt = [420, 300, 230];
  const tam = d.titulo.length <= 12 ? 96 : d.titulo.length <= 20 ? 76 : 60;
  return new ImageResponse(
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: "#111111", padding: M, fontFamily: "Inter", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: W - M * 2 }}>
        <img src={"data:image/svg+xml;base64," + logo.toString("base64")} width={354} height={70} style={{ width: 354, height: 70 }} />
        <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: "rgba(255,255,255,0.14)", color: "#FFFFFF", fontSize: 28, fontWeight: 700 }}>{d.semana}</div>
      </div>
      <div style={{ display: "flex", marginTop: 70, fontSize: 26, fontWeight: 700, letterSpacing: 3, color: L, textTransform: "uppercase" }}>Campeões da semana</div>
      <div style={{ display: "flex", flexWrap: "wrap", width: W - M * 2, marginTop: 12, fontFamily: "Unbounded", fontSize: tam, lineHeight: 1.04, letterSpacing: -3, color: "#FFFFFF" }}>{d.titulo.toUpperCase()}</div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", width: W - M * 2, marginTop: "auto", marginBottom: -M }}>
        {ordem.map(i => {
          const t = d.top[i], f = fotos[i], lugar = i + 1, um = lugar === 1;
          const lado = um ? 150 : 120;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 290, margin: "0 8px" }}>
              {f
                ? <img src={f} width={lado} height={lado} style={{ width: lado, height: lado, borderRadius: 999, border: `6px solid ${um ? L : "#FFFFFF"}`, objectFit: "cover" }} />
                : <div style={{ display: "flex", width: lado, height: lado, borderRadius: 999, background: "#2A2A2A", border: `6px solid ${um ? L : "#FFFFFF"}`, alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: 48, fontWeight: 700 }}>{t.nome.slice(0, 1).toUpperCase()}</div>}
              <div style={{ display: "flex", marginTop: 16, fontSize: 32, fontWeight: 700, color: "#FFFFFF" }}>{t.eu ? "Você" : t.nome.split(" ")[0]}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 290, height: alt[i], marginTop: 16, borderRadius: "36px 36px 0 0", background: um ? L : "#232323", paddingTop: 26 }}>
                <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: um ? 76 : 60, lineHeight: 1, letterSpacing: -2, color: um ? "#111111" : "#FFFFFF" }}>{t.valor}</div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 26, fontWeight: 700, color: um ? "#3A4A10" : "rgba(255,255,255,0.6)" }}>{t.un}</div>
                <div style={{ display: "flex", marginTop: "auto", marginBottom: -30, fontFamily: "Unbounded", fontSize: 150, lineHeight: 1, color: um ? "rgba(17,17,17,0.12)" : "rgba(255,255,255,0.08)" }}>{lugar}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>,
    { width: W, height: H, fonts: [
      { name: "Unbounded", data: unb, weight: 800, style: "normal" },
      { name: "Inter", data: i5, weight: 500, style: "normal" },
      { name: "Inter", data: i7, weight: 700, style: "normal" },
    ] },
  );
}
