import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { faixaDe, xpDoNivel } from "./niveis";

/**
 * Arte de subida de nível (1080×1350), pra salvar ou postar nos Momentos.
 * Mesmo palco da comemoração no app: fundo pronto por faixa (`assets-og/nivel/fundo-<faixa>.jpg`, com luz,
 * pódio, confete e o selo da faixa), e por cima o número no selo, o logo grande no topo e o nome embaixo.
 * Os fundos saem do mesmo desenho dos selos do app (`public/nivel/selo-<faixa>.png`).
 */
const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));

/** Destaque de cada faixa sobre o fundo escuro (igual ao `utils/nivel.js` do miniapp). */
const ACENTO: Record<string, string> = { bicho: "#E9A46C", forte: "#C6F432", sinistro: "#2EC4B6", casca: "#FF7A1A", monstro: "#A78BFA", lenda: "#C6F432", black: "#E8C66A" };
/** Selos de face escura: número na cor da faixa. */
const COR_NUM: Record<string, string> = { lenda: "#C6F432", black: "#E8C66A" };
/** Centro ótico de cada número no Unbounded (milésimos da fonte; o "1" tem a haste à direita). Igual ao miniapp. */
const CENTRO_NUM = [2,-38,-12,-30,-30,4,6,-19,2,-2,-29,-39,-40,-52,-38,-37,-39,-16,-52,-45,-2,-3,-12,-22,-2,-14,-18,23,-35,-23,-10,-14,-20,-30,-11,-23,-26,13,-43,-31,-30,-33,-39,-50,-30,-41,-46,-6,-63,-50,16,13,6,-4,15,3,-1,40,-18,-5,23,21,13,4,24,10,6,49,-11,1,-44,-40,-53,-64,-43,-53,-57,-19,-74,-62,38,31,27,18,39,23,20,62,2,15,19,16,9,0,20,6,2,44,-15,-2,-27];

// Onde o selo está no fundo (px).
const SELO = { x: 320, y: 265, w: 440, h: 505 };

export async function arteNivel(d: { nome: string; nivel: number; xp?: number }): Promise<ImageResponse> {
  const f = faixaDe(d.nivel);
  const [unb, i5, i7, logo, fundo] = await Promise.all([
    A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo3-branco.svg"), A(`nivel/fundo-${f.id}.jpg`),
  ]);
  const W = 1080, H = 1350;
  const ac = ACENTO[f.id] || f.cor;
  const primeiro = (d.nome || "").split(" ")[0] || "Atleta";
  const tam = d.nivel >= 100 ? 108 : 132;
  const desvio = ((CENTRO_NUM[d.nivel] || 0) * tam) / 1000;
  const corNum = COR_NUM[f.id] || "#121212";

  return new ImageResponse(
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: "#0B0B0B", fontFamily: "Inter", overflow: "hidden" }}>
      <img src={"data:image/jpeg;base64," + fundo.toString("base64")} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, width: W, height: H }} />

      {/* logo grande no topo */}
      <div style={{ position: "absolute", left: 0, top: 64, width: W, display: "flex", justifyContent: "center" }}>
        <img src={"data:image/svg+xml;base64," + logo.toString("base64")} width={600} height={119} style={{ width: 600, height: 119 }} />
      </div>

      {/* número no selo */}
      <div style={{ position: "absolute", left: SELO.x + desvio, top: SELO.y + SELO.h * 0.44 - tam * 0.7, width: SELO.w, height: tam * 1.4, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "Unbounded", fontSize: tam, lineHeight: 1, color: corNum, textShadow: COR_NUM[f.id] ? "0 4px 0 rgba(0,0,0,0.6)" : "0 4px 0 rgba(255,255,255,0.45)" }}>{d.nivel}</div>

      {/* faixa + nome */}
      <div style={{ position: "absolute", left: 72, top: 1036, width: W - 144, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 8, textTransform: "uppercase", color: ac }}>Novo nível</div>
        <div style={{ display: "flex", marginTop: 14, fontFamily: "Unbounded", fontSize: 76, lineHeight: 1.1, letterSpacing: -2, color: "#FFFFFF" }}>{f.nome}</div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 38, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{primeiro} tá pago no nível {d.nivel}</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>{(d.xp ?? xpDoNivel(d.nivel)).toLocaleString("pt-BR")} pontos de treino</div>
      </div>
    </div>,
    { width: W, height: H, fonts: [
      { name: "Unbounded", data: unb, weight: 800, style: "normal" },
      { name: "Inter", data: i5, weight: 500, style: "normal" },
      { name: "Inter", data: i7, weight: 700, style: "normal" },
    ] },
  );
}
