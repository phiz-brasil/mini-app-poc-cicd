import type { Metadata } from "next";

/** Suporte do Tá Pago! (pedido pelo formulário do Strava): o que é, Strava, dados e contato. PT + EN. */
export const metadata: Metadata = { title: "Tá Pago! · Suporte", robots: { index: true, follow: true } };

const CONTATO = process.env.SUPORTE_EMAIL || "";

const s = {
  main: { minHeight: "100vh", background: "#F2F2EF", color: "#111111", fontFamily: "-apple-system, system-ui, sans-serif", padding: "48px 20px" },
  box: { maxWidth: 680, margin: "0 auto" },
  h1: { fontSize: 30, letterSpacing: -0.8, margin: "28px 0 8px" },
  h2: { fontSize: 20, letterSpacing: -0.4, margin: "32px 0 8px" },
  p: { fontSize: 16, lineHeight: 1.55, color: "#3A3A38", margin: "8px 0" },
  card: { background: "#FFFFFF", borderRadius: 20, padding: "20px 22px", marginTop: 16 },
  a: { color: "#111111", fontWeight: 700 },
} as const;

export default function Suporte() {
  return (
    <main style={s.main}>
      <div style={s.box}>
        <img src="/marca/v3/logo-preto.svg" alt="Tá Pago!" width={200} height={40} />

        <h1 style={s.h1}>Suporte</h1>
        <p style={s.p}>O Tá Pago! é um miniapp de treino dentro do PhizChat. Amigos montam grupos e se motivam com um ranking semanal de pontos.</p>

        <div style={s.card}>
          <h2 style={{ ...s.h2, marginTop: 0 }}>Strava</h2>
          <p style={s.p}>Conectar o Strava é opcional. Cada pessoa conecta a própria conta (Ajustes → Strava → Connect with Strava) e os treinos passam a contar sozinhos.</p>
          <p style={s.p}>Lemos só as suas atividades (permissão <code>activity:read</code>). O detalhe de cada atividade (título, tempo, distância, trajeto) aparece só pra você. Os outros membros do grupo veem só os totais do Tá Pago! (pontos, dias, minutos somados), nunca a sua atividade do Strava.</p>
          <p style={s.p}>Depois de 7 dias apagamos o detalhe das atividades do Strava e guardamos só a duração e a distância que viram pontos. Não usamos dados do Strava pra IA, anúncios nem compartilhamos com terceiros.</p>
          <p style={s.p}><b>Desconectar:</b> no Tá Pago!, Ajustes → Strava → Desconectar. Ou no Strava: Configurações → Meus aplicativos → Tá Pago! → Revogar acesso.</p>
          <img src="/strava/powered-by-strava.svg" alt="Powered by Strava" width={180} height={18} style={{ marginTop: 8 }} />
        </div>

        <div style={s.card}>
          <h2 style={{ ...s.h2, marginTop: 0 }}>Seus dados</h2>
          <p style={s.p}>Pra apagar sua conta e todos os seus dados do Tá Pago!, toque em Ajustes → Apagar minha conta, no próprio app. Se preferir, escreva pra <a style={s.a} href={`mailto:${CONTATO}`}>{CONTATO}</a>. Respondemos em até 7 dias.</p>
        </div>

        <h2 style={s.h2}>English</h2>
        <div style={s.card}>
          <p style={s.p}>Tá Pago! is a workout mini-app inside PhizChat. Friends form groups and motivate each other with a weekly points ranking.</p>
          <p style={s.p}><b>Strava:</b> optional. Each athlete connects their own account; we only read their own activities (<code>activity:read</code>). Activity details are shown only to the athlete who owns them; other members only see aggregated Tá Pago! totals, never the Strava activity itself. Activity details are deleted after 7 days; only duration and distance used for points are kept. No Strava data is used for AI, advertising, or shared with third parties.</p>
          <p style={s.p}><b>Disconnect:</b> in Tá Pago!, Settings → Strava → Disconnect, or on Strava: Settings → My Apps → Revoke access.</p>
          <p style={s.p}><b>Contact / data deletion:</b> <a style={s.a} href={`mailto:${CONTATO}`}>{CONTATO}</a></p>
        </div>
      </div>
    </main>
  );
}
