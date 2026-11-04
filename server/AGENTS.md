# Tá Pago! — miniapp de treino do PhizChat

Versão real do MVP desenhado em `garantido/miniapps/ta-pago-mvp` (protótipo):
ranking de treino, **treino à mão só com foto**, "tá pago" como curtida e
**destaques** postados pela conta oficial via OpenAPI de Clipes e Momentos.
Sem grupo e sem post em conversa.

- **Stack:** Next.js 16.2.4 (App Router), React 19, Vercel Blob (store privado `tapago-data`, gru1).
- **Vercel:** time PhizChat da empresa (`phiz-chat`), projeto `phizchat-tapago`.
  Usar sempre `--global-config ~/.vercel-empresa` (o CLI padrão é a conta antiga).
- **Código (GitHub privado, org `phizchat-design`):** servidor em
  https://github.com/phizchat-design/tapago-server (esta pasta) e miniapp em
  https://github.com/phizchat-design/tapago-miniapp.
  Branch `main`. `.env.local` e `.vercel` nunca vão pro repositório.
- **Dev:** `npm run dev` → http://localhost:3020 · `npm run typecheck`
- **Deploy:** `vercel deploy --prod --yes --global-config ~/.vercel-empresa`
- **App ID (OpenAPI):** só no env `PHIZ_APP_ID` (nunca no código nem nos docs).

## Marca v3 (21/10/2026)

Símbolo = o check ORIGINAL de pontas redondas (`ta-pago-icone.svg`), ícone limão com check preto; logo = símbolo + "TÁ PAGO!" em Unbounded 800
inclinado (gerado por `marca3.js` com opentype.js). Cópias usadas pela arte em `assets-og/` (logo3-*, icone3-*).
Quadro da marca: `/api/marca/quadro`. Cores: limão #C6F432, preto #111111, **violeta #8B5CF6** (acento de conquista: campeão, degradês), cinza frio #E4E4E0, gelo #F2F2EF.

## Versão 1.0 (21/10/2026): segurança

- **Web antiga desligada**: o login por cookie (`/entrar`) não tinha assinatura. Páginas e APIs antigas foram
  movidas pra `_legado_web/` (fora do build). Só existe o miniapp (`/api/mini/*`, token HMAC).
- **PhizID é de uma conta só** (`garantirUsuario`): quem chega depois com o mesmo PhizID fica sem ele — impede
  herdar telefone (mensagens) e selo. "verificado" vindo do aparelho é ignorado.
- **Webhook do Strava**: só aceita `STRAVA_SUBSCRIPTION_ID`; "apagou" e "desconectou" são conferidos na API do Strava.
- **Limites**: 2 treinos à mão/dia (IA confere a foto), 20 fotos de moldura/dia.
- **IA da foto exigente**: precisa de PROVA de treino (roupa de treino, suor, equipamento, ambiente, relógio);
  sem prova = recusada. effort "medium".
- **Convite por amigos do PhizChat**: o miniapp lê `pz.getFriends` e manda os PhizIDs escolhidos
  (`/api/mini/grupos` acao "convidar"); o convite aparece na home de quem tiver esse PhizID ("responder").
- Login ainda é o de aparelho (`MINI_DEV_LOGIN=1`) até o login unificado da PhizClip ser ligado.

## Camadas

| Arquivo | O que faz |
|---|---|
| `src/lib/store.ts` | Tudo que fala com o Blob. Banco inteiro em `tapago/banco.json`; fotos em `tapago/fotos/<uid>/<id>.jpg`. |
| `src/lib/sessao.ts` | **Quem é a pessoa.** Hoje: cookie de teste (`/entrar`). Trocar pelo login do SDK de miniapp do PhizChat — é o único arquivo que muda. |
| `src/lib/phiz-openapi.ts` | Cliente da OpenAPI v1.4: token (cache 2 h), robôs, presign, upload, publicar Clipes/Momentos, resultado. |
| `src/lib/destaques.ts` | Posta o treino de quem deu opt-in nos Momentos, pela conta robô. Nunca bloqueia o registro. |
| `src/lib/ranking.ts` | Ranking de hoje e da semana, sequência de dias. |
| `src/lib/tipos.ts` | Tipos de treino, limites, dia em São Paulo. |

## Regras de produto (não mudar sem o Bayer)

- **Treino à mão só entra com foto.** A API recusa sem foto. A foto aparece no ranking.
- Treino à mão conta **até 90 min por dia** (registro aceita 10–180).
- **Ranking geral = Pontos Tá Pago!** (`PONTOS` em `lib/tipos.ts`): por dia, 10 por ter treinado + 1 a cada 5 min
  (até 120) + 1 por km (até 20) → máx. 54/dia. Só entra quem tem `aparecer` ligado (e PhizID); quem desliga some até pra si mesmo.
- **Grupo escolhe a métrica** na criação: dias ativos, duração (min) ou distância (km). Grupos antigos = duração.
  Membros do grupo sempre se veem, mesmo com `aparecer` desligado. Períodos: hoje / semana / mês (`rankingPor`).
- Km à mão é opcional (corrida, caminhada, bike, natação), conta até 20 km/dia.
- **Antifraude da foto** (`lib/validacao.ts`): antes de gravar, Claude (`claude-opus-5-5`, effort low) olha a foto →
  ok / dúvida / recusada. Recusada volta 422 com o motivo e não entra. Sem `ANTHROPIC_API_KEY` ou se a IA falhar,
  entra como "pendente" (nunca derruba o registro). dHash 8×8 pega foto quase igual às últimas 30 (vira dúvida).
  Máx. 2 treinos à mão por dia.
- "Tá pago": uma vez por pessoa por dia.
- **Cutucar** (`/api/mini/cutucar`): **só dentro de grupo** (página do grupo; o servidor exige grupo em comum), uma por pessoa por dia, só em quem não treinou hoje; vira mensagem no chat
  de quem foi cutucado (`avisarCutucada`) e aviso na home dela.
- **Selo verificado** (azul #1679E2): `ehVerificado` = campo do perfil do PhizChat (o getUserInfo ainda não manda)
  ou lista `TAPAGO_VERIFICADOS` (PhizIDs) no beta.
- **Resumo de domingo** (cron `/api/cron/domingo`, dom 20h BRT): pódio da semana de cada grupo (2+ pessoas) e do
  geral, arte `lib/arte-podio.tsx` por link assinado `urlPodio`. Teste: `?so=<uid>`.
- **Campeão da semana**: `fecharSemana` (lib/domingo.ts) guarda o 1º de cada grupo (2+ pessoas) e do geral em
  `vitorias` (empate = todos levam). Roda no cron de domingo e, se faltar, na 1ª abertura da semana seguinte.
  O app comemora a vitória não vista (`vitoria` no painel) e conta as semanas vencidas (troféus no Eu e no ranking).
- **Destaques são opt-in** (Ajustes). A OpenAPI publica como **conta robô**, já aprovado e no ar —
  nunca no perfil da pessoa.
- No PhizChat a pessoa já está logada: a tela `/entrar` é só do beta.

## O que falta (depende do time de plataforma)

1. **SDK de miniapp**: login/identidade (trocar `sessao.ts`), lista de contatos que usam o miniapp
   (hoje o ranking é de todo mundo do beta), ponte com Apple Saúde / Health Connect (treino automático).
2. **OpenAPI** (21/10/2026): hosts passados pela plataforma — prod `admin.phiz.chat` (**NÃO testar lá**) e
   QA `admin-test.phiz.chat`. O Vercel aponta pro QA (`PHIZ_OPENAPI_HOST`), mas esse host **não resolve no DNS
   público** (NXDOMAIN): deve ser rede interna/VPN. Falta: endereço do QA acessível de fora (ou liberar pro Vercel)
   e confirmar se o appId/appSecret valem no QA. Diagnóstico: `/api/openapi/status` (logado).
3. **Contrato do Momento**: o guia diz "per downstream contract" pros campos `type`, `okey`, `tkey`.
   Hoje: `type=1`, mídia `type=1`, `okey` = caminho do `downloadUrl` (env `PHIZ_MOMENT_*`). Confirmar.
4. **Clipe**: precisa de MP4 com mapa e números gerado no servidor (template Meishe) antes de publicar.
5. **Menção**: o `batchPublish` não tem campo de @; o nome vai só no texto.

## Pegadinhas

- `vercel blob list` falha com o `.env.local` puxado (OIDC + store). Pra mexer no store localmente:
  `set -a; . ./.env.local; set +a` e usar o SDK em `node -e`.
- `npm install` precisa de `--cache <scratchpad>` (cache do npm da home sem permissão).
- Blob privado: foto nunca tem URL pública, sai pela rota `/api/foto/...` (exige sessão).

## Miniapp nativo (PhizClip) — repositório `tapago-miniapp`

Rotas em `/api/mini/*` (token HMAC em `Authorization: Bearer`, ver `lib/mini-sessao.ts`):
`auth` · `painel` · `moments` (artes prontas; `/foto` monta os 3 frames da foto nova; `/postar` posta pela conta Tá Pago!) · `cutucar` · `perfil` (página Eu: números, calendário, tipos, treinos; POST apagar) · `grupo` (página do grupo: ranking + soma + feed) · `treinos` (devolve `resumo` pra tela de parabéns; 422 com `titulo` engraçado se a foto for recusada) · `publicar` · `tapago` · `eu` · `strava`.
Foto por link assinado `/api/f/...`. **Nunca devolver `Usuario` cru:** usar `publico(u)` (esconde tokens do Strava).

## Strava

`lib/strava.ts`: ticket assinado → `/api/strava/conectar` → OAuth → `/api/strava/callback` (guarda tokens,
importa o dia) → webhook `/api/strava/webhook` (atividade nova/apagada, desautorização).
Webhook = o Strava avisa sozinho (não precisa abrir o app). Cada treino novo manda mensagem no chat
(`avisarStrava`, com a arte por link assinado `urlArte`) e aparece uma vez numa folha na home (`stravaNovo`).
Atividade lançada à mão no Strava entra com `pendenteFoto` (não conta) até a pessoa pôr foto no app
(`/api/mini/treinos/foto`, mesma conferência da IA). Arte: foto do app → foto do Strava → trajeto (polyline) → tipo.
Falta: criar o app em strava.com/settings/api (Authorization Callback Domain = `phizchat-tapago.vercel.app`),
pôr `STRAVA_CLIENT_ID` e `STRAVA_CLIENT_SECRET` no Vercel e chamar uma vez
`POST /api/strava/assinar` com `Authorization: Bearer $TAPAGO_SESSION_SECRET` (cria o webhook).
App novo do Strava começa com capacidade de 1 atleta: pedir aumento ao Strava antes do beta.
Termos da API (nov/2024): dado de atleta só pode ser mostrado pra ele mesmo — o ranking mostra pros outros.

## Strava — regras pra revisão (21/10/2026)

- Botão oficial "Connect with Strava" e selo "Powered by Strava" (artes do kit deles, sem alterar) no miniapp,
  e "Powered by Strava" na arte de treino que veio de lá. "View on Strava" (laranja #FC5200, negrito) abre a atividade.
- Atividade do Strava em detalhe só pro dono: pros outros vira "Treinou" + pontos (ranking `fezTexto`, feed `soPontos`).
- Depois de 7 dias o detalhe some (`limparStravaAntigo`, no cron das 17h): ficam duração e distância.
- **Web-view do PhizChat nem sempre abre o login do Strava** (mesmo com `www.strava.com` na lista de domínios).
  Plano B "Não abriu? Conectar pelo navegador": `/api/mini/strava` `{acao:"link", navegador:true}` faz ticket de
  30 min e manda o link no chat (`mandarLinkStrava`, abre no navegador do PhizChat); sem telefone, o app copia o link.
- Página de suporte: `/suporte` (PT + EN). Formulário de capacidade: share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8.

## Garmin

Por enquanto **pelo Strava** (Garmin Connect → Apps conectados → Strava). Direto exige aprovação no
Garmin Connect Developer Program (Activity API, push).

## Ranking geral, timeline e privacidade (out/2026)
- Ranking padrão = **Geral (período "total", desde sempre)**; Semana e Mês são recortes. Grupo: abas Geral/Semana/Mês, o Geral respeita `inicio`/`fim` opcionais do desafio.
- Dono do grupo (`criador`) edita nome, métrica e datas: `POST /api/mini/grupos {acao:"editar"}`.
- `Treino.visivel {geral, grupos:"todos"|[ids]}`: escolhido no registrar ("Quem pode ver"). Pontos contam sempre; a visibilidade só decide onde o post aparece. Timeline geral: `src/lib/timeline.ts`, `GET /api/mini/timeline?antes=`.
- `Usuario.perfilPublico` (padrão true): `GET /api/mini/perfil?uid=` devolve 403 `{privado}` se fechado; pros outros só vai o que está na timeline geral, e Strava sem detalhe.
- Strava sem duplicar: treino manual entre o início e 3h depois do fim da atividade recebe os dados do Strava; registrar à mão até 4h depois de um Strava dá 409 (oferece pôr a foto nele).
- Folha "Chegou do Strava" mostra "Treino salvo · já conta pontos"; Editar → `POST /api/mini/treinos/editar {id,titulo,visivel}`.
- Card do treino sem foto (`src/lib/card-treino.ts`): por categoria (corrida/caminhada/bike = km + ritmo/velocidade, natação = metros + ritmo/100 m, força = duração + kcal/bpm), rota só como forma (sem mapa). Agora aparece pra todos (decisão do Bayer, out/2026). Cores no miniapp: `utils/card.js` + `.tc-*` no app.pzss.
- O @ do PhizChat (`usuario`) é confidencial: nunca vai pra tela, nem pra própria pessoa.
- **Mapa de fundo** (`src/lib/mapa.ts`): desenhado por nós a partir dos tiles vetoriais do OpenFreeMap (OSM, grátis, sem chave) — ruas, água e verde, **nenhum texto**. CARTO pede chave (tiles com marca d'água) e o osm-no-labels da Wikimedia saiu do ar. Rota perde ~250 m de cada ponta (privacidade). Card do app: `/api/arte/mapa/<id>.png` (urlMapa, assinado e estável por dia); arte de post: mapa escuro (sem foto) ou mini mapa no canto (com foto). Bairro/cidade via Nominatim na entrada do Strava (`Treino.lugar`, some no expurgo de 7 dias). Prévias: `/api/arte/demo/mapa`, `/api/arte/demo/trajeto`, `/api/arte/demo/foto?mapa=1`.
- Ícones dos tipos: Phosphor Icons (MIT), bold nas listas e fill nos cards (`utils/icones-tipos.js`).

## Admin (`/admin`, out/2026)
- https://phizchat-tapago.vercel.app/admin — senha única do time (env `ADMIN_SENHA`, a mesma dos sites internos), cookie assinado 30 dias (`lib/admin-sessao.ts`).
- Números em `lib/admin.ts` (banco + `lib/metricas.ts`). Métricas ficam em `tapago/metricas.json`, separado do banco: sessões (abriu o painel; nova sessão após 30 min), envios do bot (tipo, status, msgId), status vindos do webhook do bot (entregue/lida — até hoje o PhizChat não manda), eventos (foto conferida pela IA, Strava tentou/conectou/desconectou).
- "Abriu depois da mensagem" = sessão em até 2 h / 24 h; "treinou" = treino em até 24 h. Só vale pra mensagens depois do começo das métricas.
- Dev local: `next dev --webpack` (o binário nativo do SWC é bloqueado no Mac); `sharp` também não roda no Mac.
- `/admin/tecnico`: "Como funciona" — o lado técnico explicado em linguagem simples (texto fixo; atualizar quando a arquitetura mudar).
- Card do treino (out/2026, v2): escuro pra todas as categorias, sem título (só a categoria num selo limão), número grande branco, stats embaixo; com trajeto, mapa escuro + rota limão (`fundoDoCard`, `urlMapa` com `v=2`). Laranja só no "Powered by Strava".
- **Régua de comunicação** (`/admin/regua`, `lib/regua.ts`): todos os passos de mensagem do bot por fase (Entrada, Dia a dia, Strava, Grupos, Ranking geral, Volta pro app). Passos "no ar" são lidos por `lib/mensagens.ts` via `textoDe(id, vars)` (desligado = não manda; `---` separa versões sorteadas). "Planejados" ficam só no papel até alguém programar o gatilho. Edições em `tapago/regua.json` (cache de 60 s).
- **Avisos no chat (out/2026):** desligar = `avisos:false` + `avisosSaiuEm` (o telefone NUNCA é apagado). Ligar sem telefone = `querAvisos` (pedido). Folha "Receba o Tá Pago! no chat" na home pra quem não tem telefone/pedido/saída (e não disse "Agora não" nos últimos 14 dias: `avisosPerguntaEm`). Admin `/admin/avisos`: lista quem pediu, põe o telefone (`POST /api/admin/avisos`) e manda as boas-vindas na hora.
- **Grupos são secretos:** no perfil de outra pessoa não vai o número de grupos nem o nome do grupo dos troféus ("Grupo" ou "Ranking geral").
- Fotos de treino não abrem em tela cheia (sem zoom). Favicon do site: `src/app/icon.svg`.
- **Níveis (PROPOSTA, `/admin/niveis`, `lib/niveis.ts`):** XP = Pontos Tá Pago! acumulados; nível 1→100 que nunca cai; curva `1,6·(n−1)^2,346 + 50·(n−1)` (endurecida em 26/10/2026: campeão da 1ª semana fecha no nível 3; regular 4x/sem: nível 10 ≈ 2 meses, 20 ≈ 6 meses, 60 ≈ 5 anos; quem já tinha visto nível maior tem o `nivelVisto` acertado no painel). 7 faixas (Animado, Forte, Sinistro, Casca grossa, Monstro, Lenda, Tá Pago Black), recompensas por nível (app/cupom/loja/brinde), insígnias e temporadas. A página simula com o XP real e projeta quantos chegam a cada brinde em 3/6/12 meses. No app (26/10/2026): tag "Nível N + faixa" embaixo do nome em qualquer perfil (o dos outros recebe só `nivelTag`); card com barra e "faltam X pontos" só no próprio; sem jornada (a pessoa descobre os destraves subindo); comemoração de subida de nível em tela cheia na home (`subiuNivel` do painel; visto em `Usuario.nivelVisto`, 1ª vez = "Chegaram os níveis!"); arte `/api/arte/nivel/<n>.png` (`urlNivel`; fundo pronto por faixa em `assets-og/nivel/fundo-<faixa>.jpg` + número, logo e nome por cima); mensagem no chat só quando muda de faixa (régua `subiu-faixa`).
- Brasões das faixas (rascunho, ainda fora do app): `marca/brasoes/` (SVGs + `gerar.js`).
- **Selos de nível (27/10/2026):** um selo por faixa, cada um com formato e cor (Animado moeda bronze, Forte hexágono limão, Sinistro escudo verde-água, Casca grossa octógono laranja, Monstro losango roxo, Lenda serrilhado preto, Black estrela dourada), em `public/nivel/selo-<faixa>.png` (o miniapp carrega daqui). O número vai por cima, com o centro ótico de cada número do Unbounded (`CENTRO_NUM`, igual em `utils/nivel.js` do miniapp e em `lib/arte-nivel.tsx`). No app: comemoração com palco (luz na cor do selo, pódio, selo caindo, confete), etiqueta e card do nível no perfil.

## Segurança (revisão de 27/10/2026)

- **Ids:** `Usuario.id` é aleatório (`u_…`, `lib/ids.ts`) e pode aparecer pros outros. Login de teste: `chave` = HMAC("dev:"+id do aparelho)
  e `segredo` = HMAC do segredo de 64 hex que nasce no app (`tp_seg`). Conta com segredo só entra com ele.
  `LOGIN_EXIGE_SEGREDO=1` recusa entrada sem segredo (ligar quando a versão nova do miniapp estiver publicada).
  Os 62 ids antigos `dev_<id do aparelho>` foram migrados em 27/10 (fotos movidas, métricas trocadas); token antigo cai e o app entra de novo.
- **Nunca** mandar pra outra pessoa: telefone, `usuario` (@), `phizId` fora do próprio grupo, `chave`, `segredo`, tokens do Strava. `publico()` tira tudo isso.
- **Apagar conta:** `POST /api/mini/conta {acao:"apagar", confirma:"APAGAR"}` → `lib/apagar-conta.ts` (Ajustes → "Apagar minha conta").
- **Admin:** senha forte só no env `ADMIN_SENHA` (e no `.env.local`); 5 erros em 15 min bloqueiam o IP (`lib/admin-tentativas.ts`).
- **Fail-closed:** cron sem `CRON_SECRET` e webhook do bot sem segredo (em produção) recusam. Headers de segurança no `next.config.ts`.
- **Repositório:** nada de App ID, e-mail, caminho do Mac, telefone ou id de usuário em código, comentário ou doc. `docs/` fica fora do Git.

## Campanhas ao vivo (28/10/2026) — `/admin/campanhas`
- `lib/campanhas.ts`: conquistas (badges) e temas do dia. Padrões no código + `tapago/campanhas.json` (admin). O miniapp (1.2.0+) só desenha: badge novo, tema novo, enfeite novo **não precisam de atualização**.
- Conquista: imagem, cor, regra (`todos` até data / `treino` entre datas / `manual`), `mostrarDe` (aparece bloqueada no perfil), testadores. Fica em `usuario.conquistas` pra sempre; `vista` = comemoração já mostrada.
- Dar conquista: `concederConquistas` (lib/conquistas-acoes.ts) no painel e depois de cada treino (app e Strava). Por treino → mensagem com a arte (`/api/arte/conquista/<id>.png`, link assinado).
- Tema: entre datas (SP) muda o card da home, faixa no topo e enfeite nos avatares (x/y/w em % do avatar). Testadores veem antes.
- Régua: `conquista-ganhou`, `campanha-lembrete` (9h) e `campanha-ultima` (20h) em `/api/cron/regua`.
- Imagens enviadas no admin: Blob `tapago/midia/*` servidas por `/api/midia/<nome>`.
