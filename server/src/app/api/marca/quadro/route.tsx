import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { arteMomento } from "@/lib/arte";

/** Quadro da marca Tá Pago! (v2): logo, símbolo, cores, tipos e a arte do post. Público, só marca. */
export const runtime = "nodejs";

const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));
const L = "#C6F432", P = "#111111", G = "#E4E4E0", C = "#F2F2EF", V = "#8B5CF6";

export async function GET() {
  const [unb, i5, i7, lp, lb, sl, sp] = await Promise.all([A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo3-preto.svg"), A("logo3-branco.svg"), A("icone3-preto.svg"), A("icone3-limao.svg")]);
  const u = (b: Buffer) => "data:image/svg+xml;base64," + b.toString("base64");
  const post = await arteMomento({ nome: "Fillip Bayer", min: 39, tipo: "Corrida", titulo: "Ibira run", km: 6, pos: 1, seq: 3, pontos: 23, quando: "sáb, 11 out",
    rota: Array.from({ length: 140 }, (_, i) => { const a = (i / 139) * Math.PI * 2; return [-23.587 + 0.006 * Math.sin(a) + 0.001 * Math.sin(2 * a), -46.657 + 0.009 * Math.cos(a)] as [number, number]; }) });
  const postSrc = "data:image/png;base64," + Buffer.from(await post.arrayBuffer()).toString("base64");
  const tile = (extra: Record<string, unknown>) => ({ display: "flex", borderRadius: 48, overflow: "hidden", position: "relative" as const, ...extra });
  const rot = { fontSize: 20, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" as const };

  return new ImageResponse(
    <div style={{ width: 1800, height: 1300, display: "flex", flexDirection: "column", background: C, padding: 40, fontFamily: "Inter" }}>
      <div style={{ display: "flex", height: 600 }}>
        <div style={tile({ width: 1000, height: 600, background: L, alignItems: "center", justifyContent: "center" })}>
          <img src={u(lp)} width={800} height={158} style={{ width: 800, height: 158 }} />
          <div style={{ position: "absolute", left: 44, bottom: 36, display: "flex", ...rot, color: "rgba(17,17,17,.6)" }}>Logo · check + Unbounded</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 30, width: 690 }}>
          <div style={tile({ width: 690, height: 285, background: P, alignItems: "center", justifyContent: "center" })}>
            <img src={u(lb)} width={540} height={107} style={{ width: 540, height: 107 }} />
          </div>
          <div style={{ display: "flex", marginTop: 30, height: 285 }}>
            <div style={tile({ width: 330, height: 285, background: "#FFFFFF", alignItems: "center", justifyContent: "center" })}>
              <img src={u(sl)} width={200} height={200} style={{ width: 200, height: 200 }} />
            </div>
            <div style={tile({ width: 330, height: 285, marginLeft: 30, background: L, alignItems: "center", justifyContent: "center" })}>
              <img src={u(sp)} width={200} height={200} style={{ width: 200, height: 200 }} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", marginTop: 30, height: 630 }}>
        <div style={tile({ width: 520, height: 630, background: "#FFFFFF" })}>
          {[["Limão", L, P, "#C6F432"], ["Preto", P, "#FFFFFF", "#111111"], ["Violeta", V, "#FFFFFF", "#8B5CF6"], ["Cinza frio", G, P, "#E4E4E0"]].map((c, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 130, height: 630, background: c[1], padding: "0 0 34px 22px" }}>
              <div style={{ display: "flex", ...rot, fontSize: 18, color: c[2] }}>{c[0]}</div>
              <div style={{ display: "flex", fontSize: 18, fontWeight: 500, color: c[2], marginTop: 4 }}>{c[3]}</div>
            </div>
          ))}
        </div>
        <div style={tile({ width: 640, height: 630, marginLeft: 30, background: P, flexDirection: "column", padding: 48 })}>
          <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 200, lineHeight: 1, color: L, letterSpacing: -8 }}>Aa</div>
          <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 36, color: "#FFFFFF", marginTop: 20 }}>UNBOUNDED</div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,.6)", marginTop: 6 }}>Títulos e números grandes</div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#FFFFFF", marginTop: 40 }}>Inter</div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(255,255,255,.6)", marginTop: 6 }}>Texto, rótulos e botões</div>
          <div style={{ display: "flex", marginTop: "auto", alignSelf: "flex-start", background: L, color: P, borderRadius: 999, padding: "16px 30px", fontSize: 26, fontWeight: 700 }}>Treinou? Tá pago.</div>
        </div>
        <div style={tile({ width: 504, height: 630, marginLeft: 30, background: P })}>
          <img src={postSrc} width={504} height={630} style={{ width: 504, height: 630 }} />
        </div>
      </div>
    </div>,
    { width: 1800, height: 1300, fonts: [
      { name: "Unbounded", data: unb, weight: 800, style: "normal" },
      { name: "Inter", data: i5, weight: 500, style: "normal" },
      { name: "Inter", data: i7, weight: 700, style: "normal" },
    ] },
  );
}
