/** Página simples (abre no web-view do miniapp depois do OAuth). */
export function pagina(titulo: string, texto: string, ok = true): Response {
  const cor = ok ? "#C6F432" : "#E5484D";
  const traco = ok ? "#111111" : "#FFFFFF";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tá Pago!</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:-apple-system,system-ui,sans-serif;background:#F2F2EF;color:#111111;text-align:center}
.c{padding:32px;max-width:360px}.s{width:84px;height:84px;border-radius:26px;background:${cor};margin:0 auto 24px;display:flex;align-items:center;justify-content:center}
h1{font-size:26px;letter-spacing:-.6px;margin:0}p{font-size:16px;line-height:22px;color:#666;margin:10px 0 0}.v{margin-top:28px;font-size:14px;color:#7A7A76}
</style></head><body><div class="c"><div class="s"><svg viewBox="0 0 24 24" width="48" height="48" fill="none"><path d="${ok ? "M5 12.5l4.2 4.2L19 7" : "M7 7l10 10M17 7L7 17"}" stroke="${traco}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
<h1>${titulo}</h1><p>${texto}</p><p class="v">Toque em ‹ lá em cima (ou volte pro PhizChat) pra continuar no Tá Pago!</p></div></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { "content-type": "text/html; charset=utf-8" } });
}
