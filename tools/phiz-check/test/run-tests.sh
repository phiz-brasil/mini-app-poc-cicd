#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Regressão do phiz:check (exigência da RFC: mutações ruins DEVEM falhar,
# exemplos bons DEVEM passar). Roda no CI como job "quality / phiz-rules".
# ---------------------------------------------------------------------------
set -u
cd "$(dirname "$0")"
CHECK="node ../phiz-check.js"
FIX="fixtures"
FAILS=0

espera_bloqueio() { # $1 desc, $2 dir, $3 profile
  if $CHECK "$2" --profile "$3" >/dev/null 2>&1; then
    echo "FAIL (deveria BLOQUEAR): $1"; FAILS=$((FAILS+1))
  else
    echo "ok   (bloqueou como esperado): $1"
  fi
}
espera_passagem() { # $1 desc, $2 dir, $3 profile
  if $CHECK "$2" --profile "$3" >/dev/null 2>&1; then
    echo "ok   (passou como esperado): $1"
  else
    echo "FAIL (deveria PASSAR): $1"; FAILS=$((FAILS+1))
  fi
}

echo "— exemplos reais (devem passar) —"
# Exemplos reais = o código de app da própria branch. Sem miniapp/ ou server/
# (teste do zero), o exemplo é indisponível e não conta como falha.
if [ -d "../../../miniapp" ]; then
  espera_passagem "miniapp tapago" "../../../miniapp" miniapp
else
  echo "—    (sem miniapp/ na branch — exemplo real indisponível)"
fi
if [ -d "../../../server" ]; then
  espera_passagem "server tapago"  "../../../server"  server
else
  echo "—    (sem server/ na branch — exemplo real indisponível)"
fi

echo "— mutações ruins (devem falhar) —"
espera_bloqueio "secret no cliente"     "$FIX/miniapp-bad-secret"    miniapp
espera_bloqueio "pagamento no cliente"  "$FIX/miniapp-bad-payment"   miniapp
espera_bloqueio "X-Sign no cliente"     "$FIX/miniapp-bad-signheader" miniapp
espera_bloqueio ".env versionado"       "$FIX/server-bad-env"        server

echo ""
if [ "$FAILS" -gt 0 ]; then echo "REGRESSÃO: $FAILS falha(s)"; exit 1; fi
echo "regressão verde: regras bloqueiam o que devem e passam o que devem"
