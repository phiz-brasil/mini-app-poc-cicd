import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Frames do Tá Pago! por cima de uma foto qualquer (pra postar nos Moments).
 *   selo    — foto cheia + carimbo "TÁ PAGO!" girado e o logo no canto.
 *   faixa   — foto + faixa preta embaixo com logo, data e o treino do dia.
 *   moldura — borda limão grossa em volta da foto, logo embaixo no centro.
 * 1080×1350 (4:5). Os números do dia entram quando a pessoa treinou hoje.
 */
export type Frame = "selo" | "faixa" | "moldura";
export const FRAMES: Frame[] = ["selo", "faixa", "moldura"];
export type DadosFrame = { foto: string; quando: string; nome: string; treino?: string; min?: number; pontos?: number };

const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));
const L = "#C6F432", P = "#111111", V = "#8B5CF6";

export async function arteFrame(frame: Frame, d: DadosFrame): Promise<ImageResponse> {
  const [unb, i5, i7, lb, lp] = await Promise.all([A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo3-branco.svg"), A("logo3-preto.svg")]);
  const svg = (b: Buffer) => "data:image/svg+xml;base64," + b.toString("base64");
  const W = 1080, H = 1350;
  const linha = d.treino ? `${d.treino}${d.min ? ` · ${d.min} min` : ""}${d.pontos ? ` · +${d.pontos} pts` : ""}` : "Treino de hoje";
  let corpo;
  if (frame === "selo") {
    corpo = <>
      <img src={d.foto} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H, objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: 260, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,0.5), rgba(0,0,0,0))" }} />
      <div style={{ position: "absolute", left: 0, bottom: 0, width: W, height: 420, display: "flex", background: "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.6))" }} />
      <img src={svg(lb)} width={300} height={59} style={{ position: "absolute", left: 64, top: 64, width: 300, height: 59 }} />
      <div style={{ position: "absolute", left: 64, bottom: 72, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#FFFFFF" }}>{d.quando}</div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 500, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>{linha}</div>
      </div>
      <div style={{ position: "absolute", left: W - 64 - 300, top: H - 72 - 300, width: 300, height: 300, borderRadius: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: L, border: `10px solid ${P}`, transform: "rotate(-14deg)", boxShadow: "0 30px 70px rgba(0,0,0,0.45)" }}>
        <svg width="70" height="70" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke={P} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 42, color: P, letterSpacing: -1, marginTop: 2, whiteSpace: "nowrap" }}>TÁ PAGO!</div>
      </div>
    </>;
  } else if (frame === "faixa") {
    const fh = 1080;
    corpo = <>
      <img src={d.foto} width={W} height={fh} style={{ position: "absolute", left: 0, top: 0, width: W, height: fh, objectFit: "cover" }} />
      <div style={{ position: "absolute", left: 0, top: fh, width: W, height: H - fh, display: "flex", alignItems: "center", justifyContent: "space-between", background: P, padding: "0 64px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <img src={svg(lb)} width={300} height={59} style={{ width: 300, height: 59 }} />
          <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.7)", marginTop: 16 }}>{d.quando} · {linha}</div>
        </div>
        <div style={{ display: "flex", width: 120, height: 120, borderRadius: 999, background: L, alignItems: "center", justifyContent: "center" }}>
          <svg width="64" height="64" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke={P} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, top: fh - 10, width: W, height: 10, display: "flex", background: `linear-gradient(90deg, ${L}, ${V})` }} />
    </>;
  } else {
    const b = 44, ph = H - b - 190;
    corpo = <>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", background: `linear-gradient(160deg, ${L} 0%, ${L} 60%, #B7E62A 100%)` }} />
      <img src={d.foto} width={W - b * 2} height={ph} style={{ position: "absolute", left: b, top: b, width: W - b * 2, height: ph, borderRadius: 48, objectFit: "cover", boxShadow: "0 30px 60px rgba(17,17,17,0.3)" }} />
      <div style={{ position: "absolute", left: 0, top: b + ph, width: W, height: H - b - ph, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <img src={svg(lp)} width={380} height={75} style={{ width: 380, height: 75 }} />
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "rgba(17,17,17,0.65)", marginTop: 12 }}>{d.quando} · {linha}</div>
      </div>
    </>;
  }
  return new ImageResponse(
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: P, fontFamily: "Inter", overflow: "hidden" }}>{corpo}</div>,
    { width: W, height: H, fonts: [
      { name: "Unbounded", data: unb, weight: 800, style: "normal" },
      { name: "Inter", data: i5, weight: 500, style: "normal" },
      { name: "Inter", data: i7, weight: 700, style: "normal" },
    ] },
  );
}
