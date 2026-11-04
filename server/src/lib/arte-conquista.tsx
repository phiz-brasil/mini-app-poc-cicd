import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Conquista } from "./campanhas";

/**
 * Arte de conquista (1080×1350), pra salvar ou postar nos Momentos: palco escuro com luz na cor do badge,
 * o badge no meio, o logo grande no topo e o nome embaixo. A imagem do badge vem por URL (pública do site
 * ou mídia enviada no admin), então badge novo não precisa de deploy.
 */
const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));

function rgba(hex: string, a: number) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export async function arteConquista(d: { nome: string; c: Conquista; origem: string; em?: string }): Promise<ImageResponse> {
  const [unb, i5, i7, logo, selo] = await Promise.all([
    A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo3-branco.svg"),
    fetch(d.c.imagem.startsWith("http") ? d.c.imagem : d.origem + d.c.imagem).then(r => r.arrayBuffer()),
  ]);
  const W = 1080, H = 1350, ac = d.c.cor || "#C6F432";
  const primeiro = (d.nome || "").split(" ")[0] || "Atleta";
  const data = d.em ? `${Number(d.em.slice(8, 10))}/${d.em.slice(5, 7)}/${d.em.slice(0, 4)}` : "";
  return new ImageResponse(
    <div style={{ width: W, height: H, display: "flex", position: "relative", background: "#0B0B0B", fontFamily: "Inter", overflow: "hidden" }}>
      {/* halo redondo na cor do badge (círculos com borda arredondada: o degradê não vira caixa) */}
      <div style={{ position: "absolute", left: 90, top: 110, width: 900, height: 900, display: "flex", borderRadius: 900, background: `radial-gradient(circle, ${rgba(ac, 0.5)} 0%, ${rgba(ac, 0.18)} 45%, ${rgba(ac, 0)} 70%)` }} />
      <div style={{ position: "absolute", left: 290, top: 300, width: 500, height: 500, display: "flex", borderRadius: 500, background: `radial-gradient(circle, ${rgba(ac, 0.6)} 0%, ${rgba(ac, 0)} 70%)` }} />
      <div style={{ position: "absolute", left: 0, top: 64, width: W, display: "flex", justifyContent: "center" }}>
        <img src={"data:image/svg+xml;base64," + logo.toString("base64")} width={600} height={119} style={{ width: 600, height: 119 }} />
      </div>
      <div style={{ position: "absolute", left: 270, top: 250, width: 540, height: 620, display: "flex" }}>
        <img src={"data:image/png;base64," + Buffer.from(selo).toString("base64")} width={540} height={620} style={{ width: 540, height: 620 }} />
      </div>
      <div style={{ position: "absolute", left: 72, top: 960, width: W - 144, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 8, textTransform: "uppercase", color: ac }}>{d.c.edicao || "Nova conquista"}</div>
        <div style={{ display: "flex", marginTop: 14, fontFamily: "Unbounded", fontSize: 76, lineHeight: 1.1, letterSpacing: -2, color: "#FFFFFF", textAlign: "center" }}>{d.c.nome}</div>
        <div style={{ display: "flex", marginTop: 22, fontSize: 38, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{primeiro} tá pago</div>
        <div style={{ display: "flex", marginTop: 10, fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>{d.c.descricao}{data ? ` · ${data}` : ""}</div>
      </div>
    </div>,
    { width: W, height: H, fonts: [
      { name: "Unbounded", data: unb, weight: 800, style: "normal" },
      { name: "Inter", data: i5, weight: 500, style: "normal" },
      { name: "Inter", data: i7, weight: 700, style: "normal" },
    ] },
  );
}
