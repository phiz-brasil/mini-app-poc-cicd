/**
 * O Tá Pago! é um miniapp do PhizChat: a versão web antiga (login por cookie) foi
 * desligada na 1.0 e guardada em `_legado_web/` (fora do build).
 */
export default function Pagina() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F2F2EF", fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
      <img src="/marca/v3/logo-preto.svg" alt="Tá Pago!" width={260} height={51} />
      <p style={{ marginTop: 24, fontSize: 18, color: "#3A3A38", maxWidth: 360, lineHeight: 1.45 }}>
        O Tá Pago! é um miniapp do PhizChat. Abra o PhizChat e procure por Tá Pago! nos miniapps.
      </p>
    </main>
  );
}
