# mini-app-poc-cicd

POC da **esteira de CI/CD para mini apps Phiz** (momento 1 da [RFC miniapp-cicd](https://github.com/phiz-brasil/phiz-rfcs)): qualidade e segurança automatizadas no GitHub, com o upload para a plataforma continuando manual.

Repositório **público de propósito**: no plano GitHub Free, é em repo público que branch protection e o Security tab via SARIF funcionam sem custo (variante free do plano, seção 1b). O conteúdo é o app **Tá Pago!** (mini app nativo `pz.*` + server Next.js), usado como exemplo real validado.

## Layout

```
miniapp/              app Tá Pago! (formato nativo: app.json + pages/*.pxml + pz.*)
server/               BFF do app (Next.js/TS na Vercel)
tools/phiz-check/     regras da casa ("phiz:check") + regressão com mutações ruins
.github/workflows/    a esteira (miniapp-pipeline.yml)
sonar-project.properties
CODEOWNERS            aprovação Phiz obrigatória
```

## A esteira

| Job | O que faz | Política |
|---|---|---|
| `quality / phiz-rules` | regressão das próprias regras (mutações ruins falham, exemplos passam) | BLOCK |
| `quality / miniapp` | `phiz:check` no mini app (secrets, dinheiro no cliente, X-Sign-\*, app.json, inventário pz.\*) | BLOCK (WARN em pz.\* custom e Authorization) |
| `quality / server` | `npm ci` + `tsc --noEmit` + `phiz:check` (`.env` versionado, secrets hardcoded) | BLOCK |
| `security / codeql` | SAST (JavaScript/TypeScript) → Security tab | BLOCK |
| `security / secrets` | gitleaks (código + histórico git) → Security tab | BLOCK |
| `security / sca-server` | `npm audit --audit-level=high` | BLOCK |
| `quality / sonar` | SonarQube Cloud — **dorme** até `SONAR_TOKEN` existir | BLOCK (quando ativo) |

### Calibragens do momento 1 (decisões do piloto)

- **`Authorization` no cliente = WARN.** O token de sessão do *backend do próprio app* pode; o que nunca pode é credencial da plataforma Phiz (`X-Sign-Mac`/`X-Sign-Salt` = BLOCK sempre). O BLOCK por domínio chega com a `policy/` do momento 2.
- **`pz.*` fora da lista padrão = WARN.** Sem o catálogo completo (620+13, time Phizchat) não há como bloquear; o inventário do job lista o que precisa de confirmação no host.
- **SCA bloqueia em high+** (RFC pede critical/high = BLOCK; `npm audit` não separa os dois).

## Fluxo de trabalho (formato definitivo)

1. Desenvolva na branch **`dev`** — a esteira roda a cada push.
2. Abra **PR `dev` → `main`**: a esteira precisa estar verde **e** a aprovação da Phiz (CODEOWNERS) é exigida.
3. Só depois do merge: upload do pacote via PhizClip/Open Platform, **anexando à submissão de auditoria** o link do relatório (run da esteira + Security tab).

> **Gate de aprovação na POC:** quem fez o commit não pode aprovar o próprio PR. Para testar o fluxo com duas pessoas, adicione um segundo membro ao CODEOWNERS e habilite "Require review from Code Owners" na proteção de branch. Sem isso, um admin da org consegue contornar (bypass) — é a brecha conhecida do momento 1, fechada tecnicamente no momento 2.

## Sonar (para ativar)

1. Criar a organização no [SonarQube Cloud](https://sonarcloud.io) e vincular o GitHub App à org `phiz-brasil`.
2. Ajustar `sonar.organization` / `sonar.projectKey` em `sonar-project.properties`.
3. Criar o secret `SONAR_TOKEN` no repo — o job `quality / sonar` liga sozinho.

## O que a esteira já achou (histórico real)

- **7 vulnerabilidades no server** (1 critical: RCE/SSRF em `next` 16.2.4 + highs em `postcss` e na cadeia `@vercel/blob → zod`): corrigidas subindo `next` 16.4.5, `@vercel/blob` 2.8.2 e `overrides` de `zod ^4.6.6`.
- 2 falsos positivos do `phiz:check` calibrados (string de erro com "Token:", constante de URL nomeada TOKEN).

## Fora do escopo da POC (momento 2)

Gate service no upload (fail-closed), perfis CI rápido/CD completo, whitelist completa de APIs, relatório dentro do Phizadmin/Open Platform, análise de código fora do GitHub.
