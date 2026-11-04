# Tá Pago! — miniapp nativo do PhizChat

Miniapp **nativo** do PhizClip (modelo WeChat sobre FinClip) — não é web-view.
Telas em `.pxml` (diretivas `wx:`), estilo em `.pzss` (`rpx`), API `pz.*`.

- **App ID:** fica só no `fide.project.config.json` local (fora do Git). Copie `fide.project.config.example.json` e preencha o `appid`.
- **Servidor:** https://phizchat-tapago.vercel.app (código em github.com/phizchat-design/tapago-server, rotas `/api/mini/*`)

## Rodar

PhizClip Studio → abrir projeto → esta pasta → compilar. Na IDE as chamadas
funcionam sem cadastrar domínio.

## Telas

| Página | O que faz |
|---|---|
| `pages/index` | Ranking (Hoje / Semana), "tá pago" pros outros, botão Registrar treino. Primeira vez: pergunta o nome. Puxar pra baixo atualiza. |
| `pages/registrar` | Câmera do aparelho (sem galeria). **Sem foto, não registra.** Tipo + tempo. |
| `pages/ajustes` | Nome, aparecer no ranking, entrar nos destaques. |

## Login (login unificado da PhizClip — o mesmo do PhizActivity)

**Nunca perguntamos nada.** A pessoa já está no PhizChat:

1. **PhizChat (plataforma):** injeta `currentUserId` (PhizID), `channel` e `phone` no SDK
   (`FATConfig`/`FinAppConfig`, SDK ≥ 2.45.1) e só abre o miniapp com a pessoa logada.
2. **Miniapp:** plugins `loginPlugins` + `getPhoneNumberPlugins` no `app.json`. `pz.login` → `code`.
   Em silêncio, tenta também nome/foto (`getUserInfo`, `getUserProfile`) e o idioma do aparelho.
3. **Servidor:** troca o `code` em `{PHIZCLIP_API_SERVER}/api/v1/open/dev/mini-apps/unified-auth/login`
   com um **PAT** do console (scope 小程序统一认证) → `openId`, `unionId`, `channel`.

Falta no Vercel: `PHIZCLIP_API_SERVER` e `PHIZCLIP_PAT`. Até lá vale o *modo teste*
(`MINI_DEV_LOGIN=1`): id aleatório do aparelho, nome "Atleta". O `apiserver` que o `pz.login`
devolve aparece no log do servidor (`[mini/auth]`) — é como descobrimos o endereço.

**Testar na IDE:** PhizClip Studio → condições de compilação → *全局字段配置* (configuração de
campos globais): preencher `userId`, `channel` e `phone` de teste.

## Antes de publicar (console do PhizClip)

1. **Allowlist de domínio:** `phizchat-tapago.vercel.app` para `request`,
   `uploadFile` e `downloadFile` (fotos e fontes). Sem isso funciona na IDE e
   falha no aparelho.
2. **Ícone** quadrado (PNG).
3. Submissão: conta de desenvolvedor → Centro de operação PhizClip →
   negócios → compliance → riscos → Lançamento Canário.
