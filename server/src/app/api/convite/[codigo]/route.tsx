import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { lerBanco } from "@/lib/store";

/**
 * A imagem do cartão de convite, gerada por grupo: "Vem pro <grupo>".
 * Vai no onShareAppMessage do miniapp (imageUrl). 5:4, 1000×800 (proporção do
 * cartão de miniapp no chat). Pública: o código já é o próprio convite.
 */

export const runtime = "nodejs";

const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));

export async function GET(_req: Request, ctx: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await ctx.params;
  const cod = String(codigo || "").replace(/\.png$/i, "").toUpperCase().slice(0, 12);
  const b = await lerBanco().catch(() => null);
  const g = b?.grupos.find(x => x.codigo === cod);
  const nome = g?.nome || "Tá Pago!";
  const membros = g?.membros.length || 0;
  const quem = g ? String(b?.usuarios[g.criador]?.nome || "").split(" ")[0] : "";

  const [unb, i5, i7, logo] = await Promise.all([A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo-escuro.png")]);
  const logoSrc = "data:image/png;base64," + logo.toString("base64");
  // Nome longo diminui pra caber em até 2 linhas.
  const tam = nome.length <= 10 ? 112 : nome.length <= 16 ? 92 : nome.length <= 22 ? 76 : 62;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#111111", position: "relative", padding: "64px 72px", fontFamily: "Inter" }}>
        <div style={{ position: "absolute", right: -220, top: -260, width: 760, height: 760, borderRadius: 999, background: "radial-gradient(circle, rgba(198,244,50,0.32) 0%, rgba(198,244,50,0) 62%)" }} />
        <img src={logoSrc} width={314} height={62} style={{ width: 314, height: 62 }} />
        <div style={{ display: "flex", marginTop: 92 }}>
          <div style={{ display: "flex", background: "#C6F432", color: "#111111", fontWeight: 700, fontSize: 26, letterSpacing: 2, padding: "10px 22px", borderRadius: 999, textTransform: "uppercase" }}>
            {quem ? `${quem} te chamou` : "Convite"}
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 34, fontFamily: "Unbounded", fontSize: 72, color: "#FFFFFF", letterSpacing: -2 }}>Vem pro</div>
        <div style={{ display: "flex", marginTop: 6, fontFamily: "Unbounded", fontSize: tam, lineHeight: 1.05, color: "#C6F432", letterSpacing: -3, maxWidth: 860 }}>{nome}</div>
        <div style={{ display: "flex", marginTop: "auto", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 32, color: "#B5B5B5", fontWeight: 500 }}>
            {membros > 1 ? `${membros} pessoas já estão treinando` : "Treine junto e dispute o ranking"}
          </div>
          <div style={{ display: "flex", background: "#FFFFFF", color: "#111111", fontWeight: 700, fontSize: 30, padding: "18px 34px", borderRadius: 999 }}>{g ? "Entrar no grupo" : "Bora treinar"}</div>
        </div>
      </div>
    ),
    {
      width: 1000, height: 800,
      fonts: [
        { name: "Unbounded", data: unb, weight: 800, style: "normal" },
        { name: "Inter", data: i5, weight: 500, style: "normal" },
        { name: "Inter", data: i7, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=300" },
    }
  );
}
