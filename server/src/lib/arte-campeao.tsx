import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Arte do campeão da semana (1080×1350), pra postar nos Momentos ou salvar.
 * Fundo limão, troféu desenhado (sem emoji: não depende de fonte), foto da pessoa,
 * "CAMPEÃO DA SEMANA", o grupo, o resultado e quantos troféus já venceu.
 */
export type DadosCampeao = {
  nome: string; avatar?: string; titulo: string; semana: string;
  valor: string; un: string; membros: number; total: number;
  /** 2 = feminino (getUserInfo): "campeã". */
  genero?: number;
};

const A = (f: string) => readFile(path.join(process.cwd(), "assets-og", f));
const L = "#C6F432", P = "#111111";

async function foto(url?: string): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    return `data:${r.headers.get("content-type") || "image/jpeg"};base64,` + Buffer.from(await r.arrayBuffer()).toString("base64");
  } catch { return null; }
}

// Troféu: taça + alças + haste + base, num quadro de 200×220.
const TROFEU = (cor: string, fundo: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">
  <path d="M46 16 H154 V70 C154 112 128 136 100 136 C72 136 46 112 46 70 Z" fill="${cor}"/>
  <path d="M46 34 H18 V58 C18 86 36 100 54 102" fill="none" stroke="${cor}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M154 34 H182 V58 C182 86 164 100 146 102" fill="none" stroke="${cor}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
  <rect x="88" y="132" width="24" height="40" fill="${cor}"/>
  <rect x="54" y="170" width="92" height="20" rx="6" fill="${cor}"/>
  <rect x="40" y="188" width="120" height="26" rx="8" fill="${cor}"/>
  <path d="M74 62 L92 80 L126 44" fill="none" stroke="${fundo}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const V = "#8B5CF6"; // violeta: novo acento da paleta (junto do limão)

export async function arteCampeao(d: DadosCampeao): Promise<ImageResponse> {
  const [unb, i5, i7, logo, icone] = await Promise.all([A("unbounded-800.ttf"), A("inter-500.ttf"), A("inter-700.ttf"), A("logo3-branco.svg"), A("icone3-limao.svg")]);
  const W = 1080, H = 1350, M = 72;
  const f = await foto(d.avatar);
  const primeiro = d.nome.split(" ")[0];
  const campea = d.genero === 2;
  const tam = d.titulo.length <= 12 ? 100 : d.titulo.length <= 20 ? 80 : 60;
  const trofeu = "data:image/svg+xml;base64," + Buffer.from(TROFEU(P, L)).toString("base64");
  const ini = primeiro.slice(0, 1).toUpperCase();
  const svg = (b: Buffer) => "data:image/svg+xml;base64," + b.toString("base64");
  return new ImageResponse(
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", alignItems: "center", background: "#0E0B1A", fontFamily: "Inter", position: "relative", overflow: "hidden" }}>
      {/* Degradê ousado: violeta embaixo, limão em cima, luz no meio */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex", background: `linear-gradient(160deg, #1B1530 0%, #2A1660 45%, ${V} 100%)` }} />
      <div style={{ position: "absolute", left: -300, top: -360, width: 1100, height: 1100, borderRadius: 999, display: "flex", background: "radial-gradient(circle, rgba(198,244,50,0.55) 0%, rgba(198,244,50,0) 62%)" }} />
      <div style={{ position: "absolute", left: 380, top: 720, width: 1000, height: 1000, borderRadius: 999, display: "flex", background: "radial-gradient(circle, rgba(167,139,250,0.75) 0%, rgba(139,92,246,0) 60%)" }} />
      <div style={{ position: "absolute", left: W / 2 - 360, top: 250, width: 720, height: 720, borderRadius: 999, display: "flex", background: "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 65%)" }} />

      {/* Topo: logo + semana */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: W - M * 2, marginTop: M }}>
        <img src={svg(logo)} width={354} height={70} style={{ width: 354, height: 70 }} />
        <div style={{ display: "flex", padding: "12px 24px", borderRadius: 999, background: "rgba(255,255,255,0.14)", border: "2px solid rgba(255,255,255,0.22)", color: "#FFFFFF", fontSize: 28, fontWeight: 700 }}>{d.semana}</div>
      </div>

      {/* Cartão flutuante (estilo notificação) */}
      <div style={{ display: "flex", alignItems: "center", marginTop: 54, padding: "18px 28px 18px 18px", borderRadius: 36, background: "rgba(255,255,255,0.94)",
        boxShadow: "0 24px 60px rgba(14,11,26,0.45)", transform: "rotate(-3deg)" }}>
        <img src={svg(icone)} width={76} height={76} style={{ width: 76, height: 76, borderRadius: 20 }} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: P }}>{campea ? "Campeã" : "Campeão"} da semana</div>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 500, color: "#6A6A66", marginTop: 2 }}>{d.titulo} · {d.total} {d.total === 1 ? "troféu vencido" : "troféus vencidos"}</div>
        </div>
        <div style={{ display: "flex", marginLeft: 22, width: 44, height: 44, borderRadius: 999, background: L, alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke={P} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
      </div>

      {/* A foto dela/dele, com anel limão, sombra e o troféu encostado */}
      <div style={{ display: "flex", position: "relative", width: 440, height: 440, marginTop: 56 }}>
        <div style={{ position: "absolute", left: -14, top: -14, width: 468, height: 468, borderRadius: 999, display: "flex", background: `linear-gradient(135deg, ${L} 0%, #FFFFFF 50%, ${V} 100%)`, boxShadow: "0 40px 90px rgba(14,11,26,0.55)" }} />
        {f
          ? <img src={f} width={440} height={440} style={{ position: "absolute", left: 0, top: 0, width: 440, height: 440, borderRadius: 999, objectFit: "cover" }} />
          : <div style={{ position: "absolute", left: 0, top: 0, width: 440, height: 440, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "#1B1530", color: "#FFFFFF", fontFamily: "Unbounded", fontSize: 200 }}>{ini}</div>}
        <div style={{ position: "absolute", right: -50, bottom: -10, width: 190, height: 190, borderRadius: 56, display: "flex", alignItems: "center", justifyContent: "center", background: L, transform: "rotate(10deg)",
          boxShadow: "0 24px 50px rgba(14,11,26,0.5)", border: "6px solid #FFFFFF" }}>
          <img src={trofeu} width={130} height={143} style={{ width: 130, height: 143 }} />
        </div>
      </div>

      {/* Nome do grupo */}
      <div style={{ display: "flex", marginTop: 60, fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: L }}>{primeiro} venceu a semana no</div>
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", width: W - M * 2, marginTop: 12, fontFamily: "Unbounded", fontSize: tam, lineHeight: 1.04, letterSpacing: -3, color: "#FFFFFF", textAlign: "center" }}>{d.titulo.toUpperCase()}</div>

      {/* Números num cartão de vidro com sombra */}
      <div style={{ display: "flex", width: W - M * 2, marginTop: "auto", marginBottom: M, borderRadius: 48, background: "rgba(14,11,26,0.62)", border: "2px solid rgba(255,255,255,0.14)", padding: "34px 44px", boxShadow: "0 30px 70px rgba(14,11,26,0.5)" }}>
        {[
          { v: d.valor, u: d.un === "dias" || d.un === "dia" ? (d.valor === "1" ? "dia pago" : "dias pagos") : d.un, r: "Resultado" },
          { v: String(d.membros), u: d.membros === 1 ? "pessoa" : "pessoas", r: "Na disputa" },
          { v: String(d.total), u: "", r: d.total === 1 ? "Troféu" : "Troféus" },
        ].map((n, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", width: (W - M * 2 - 88) / 3, paddingLeft: i ? 28 : 0, borderLeft: i ? "3px solid rgba(255,255,255,0.14)" : "none" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>{n.r}</div>
            <div style={{ display: "flex", alignItems: "flex-end", marginTop: 6 }}>
              <div style={{ display: "flex", fontFamily: "Unbounded", fontSize: 72, lineHeight: 1, letterSpacing: -3, color: i === 2 ? L : "#FFFFFF" }}>{n.v}</div>
              {n.u ? <div style={{ display: "flex", marginLeft: 8, marginBottom: 8, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.6)" }}>{n.u}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>,
    { width: W, height: H, fonts: [
      { name: "Unbounded", data: unb, weight: 800, style: "normal" },
      { name: "Inter", data: i5, weight: 500, style: "normal" },
      { name: "Inter", data: i7, weight: 700, style: "normal" },
    ] },
  );
}
