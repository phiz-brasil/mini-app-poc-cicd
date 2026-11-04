import { cookies } from "next/headers";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { COOKIE_ADMIN, cookieAdminOk } from "@/lib/admin-sessao";
import "../admin.css";
import "./tecnico.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tá Pago! · Como funciona", robots: { index: false, follow: false } };

/**
 * "Como funciona por dentro": o lado técnico do Tá Pago! explicado pra quem não é dev.
 * Texto fixo — atualizar quando a arquitetura mudar (ver AGENTS.md).
 */
export default async function Tecnico() {
  if (!cookieAdminOk((await cookies()).get(COOKIE_ADMIN)?.value)) redirect("/admin");
  return (
    <main className="adm tec">
      <header className="topo">
        <div className="marca">TÁ PAGO! <span>admin</span></div>
        <nav className="secoes">
          <a href="/admin">Números</a>
          <a href="/admin/niveis">Níveis</a>
          <a href="/admin/regua">Régua</a>
          <a href="/admin/campanhas">Campanhas</a>
          <a href="/admin/avisos">Avisos</a>
          <a className="on" href="/admin/tecnico">Como funciona</a>
        </nav>
      </header>

      <section>
        <h1>Como o Tá Pago! funciona por dentro</h1>
        <p className="lead">O Tá Pago! tem duas metades. O <b>miniapp</b> é a parte que a pessoa vê, rodando dentro do PhizChat. O <b>servidor</b> é a parte que guarda tudo e faz as contas: ranking, pontos, artes, mensagens. Os dois conversam pela internet o tempo todo.</p>

        <div className="diag" aria-label="Desenho das peças">
          <div className="diag-col">
            <div className="bloco escuro"><small>No celular</small><strong>PhizChat</strong><span>o app de mensagens</span></div>
            <div className="seta-v" />
            <div className="bloco limao"><small>Dentro do PhizChat</small><strong>Miniapp Tá Pago!</strong><span>telas, botões, câmera</span></div>
          </div>
          <div className="seta-h"><span>internet</span></div>
          <div className="diag-col">
            <div className="bloco"><small>Na Vercel</small><strong>Servidor</strong><span>regras, ranking, artes, mensagens</span></div>
            <div className="seta-v" />
            <div className="bloco"><small>Na Vercel</small><strong>Arquivos (Blob)</strong><span>banco de dados e fotos</span></div>
          </div>
          <div className="seta-h"><span>serviços</span></div>
          <div className="diag-col lista-ext">
            <div className="ext">Strava · treinos automáticos</div>
            <div className="ext">Claude (IA) · confere a foto</div>
            <div className="ext">Bot do PhizChat · mensagens no chat</div>
            <div className="ext">OpenStreetMap · mapas e bairro</div>
          </div>
        </div>
      </section>

      <Secao id="miniapp" t="1. O miniapp (o que a pessoa vê)">
        <Fatos itens={[
          ["O que é", "Um \"app dentro do app\": abre dentro do PhizChat, sem instalar nada. É a mesma ideia dos miniprogramas do WeChat."],
          ["Plataforma", "PhizClip, a plataforma de miniapps do PhizChat (baseada no FinClip)."],
          ["Linguagem", "JavaScript para a lógica, .pxml para montar as telas (parecido com HTML) e .pzss para o visual (parecido com CSS). As funções do celular (câmera, login, compartilhar) vêm da biblioteca pz."],
          ["Tamanho", "10 telas: home, registrar, parabéns, Eu, ajustes, grupo, Moments, começar, web (Strava) e grupo antigo. Cerca de 4.200 linhas."],
          ["Onde está o código", <a key="g" href="https://github.com/phizchat-design/tapago-miniapp">github.com/phizchat-design/tapago-miniapp</a>],
          ["Plugins", "Usa dois plugins do PhizChat: login e número de telefone."],
        ]} />
      </Secao>

      <Secao id="aprovacao" t="2. Como uma versão nova chega nas pessoas">
        <ol className="passos">
          <li><b>Editar</b> o código no Mac.</li>
          <li><b>Compilar e testar</b> no PhizClip Studio, a ferramenta de desenvolvimento do PhizChat (IDE). Dá pra testar no simulador e no celular por QR code.</li>
          <li><b>Enviar (Upload)</b> a versão pela própria IDE, com número de versão.</li>
          <li><b>Revisão</b> na Open Platform do PhizClip: o time da plataforma aprova a versão.</li>
          <li><b>Publicar</b> na Open Platform. Hoje está publicada a 1.0.2.</li>
        </ol>
        <p className="obs">Na Open Platform também ficam os <b>domínios permitidos</b>: o miniapp só fala com endereços cadastrados lá (hoje: phizchat-tapago.vercel.app e www.strava.com).</p>
        <p className="obs">Mudança só no <b>servidor</b> (regra, ranking, artes, este admin) não precisa de aprovação: vai pro ar na hora, sem mexer no miniapp.</p>
      </Secao>

      <Secao id="servidor" t="3. O servidor">
        <Fatos itens={[
          ["O que faz", "Guarda os dados, calcula pontos e ranking, confere fotos com IA, desenha as artes, recebe os treinos do Strava e manda as mensagens do bot."],
          ["Linguagem", "TypeScript (JavaScript com tipos), usando o Next.js 16 com React 19. Cerca de 4.800 linhas."],
          ["Onde roda", "Na Vercel, como \"funções\": pedaços de código que acordam quando alguém chama e dormem depois. Não tem servidor ligado 24h pra manter."],
          ["Endereço", "phizchat-tapago.vercel.app"],
          ["Conta", "Time da empresa na Vercel, plano Pro."],
          ["Onde está o código", <a key="g" href="https://github.com/phizchat-design/tapago-server">github.com/phizchat-design/tapago-server</a>],
          ["Como vai pro ar", "Um comando (vercel deploy) empacota e publica em cerca de 1 minuto. Dá pra voltar pra uma versão anterior no painel da Vercel."],
        ]} />
      </Secao>

      <Secao id="vercel" t="4. O que a Vercel guarda pra nós">
        <div className="cards3">
          <Card t="Hospedagem" d="O site, a API do miniapp, as artes e este admin." />
          <Card t="Blob (arquivos)" d="O banco de dados e as fotos, num espaço privado em São Paulo (região gru1)." />
          <Card t="Rotinas automáticas" d="Resumo todo dia às 17h e pódio de domingo às 20h (horário de Brasília)." />
          <Card t="Segredos" d="Senhas e chaves (Strava, IA, bot, assinatura) ficam guardadas lá, fora do código." />
          <Card t="Domínio" d="O endereço phizchat-tapago.vercel.app, com HTTPS." />
          <Card t="Logs" d="O histórico de cada chamada, pra investigar erro." />
        </div>
      </Secao>

      <Secao id="banco" t="5. Banco de dados">
        <p className="lead">Não é um banco tradicional (como SQL). Hoje tudo fica em <b>arquivos JSON</b> no Blob da Vercel. Pro tamanho do beta é simples, barato e rápido.</p>
        <table className="tab">
          <thead><tr><th>Arquivo</th><th>O que guarda</th></tr></thead>
          <tbody>
            <tr><td>tapago/banco.json</td><td>Pessoas, treinos, grupos, tá pagos, cutucadas, campeões e convites.</td></tr>
            <tr><td>tapago/metricas.json</td><td>O que alimenta este admin: aberturas do app, mensagens enviadas, checagens da IA e tentativas de Strava.</td></tr>
            <tr><td>tapago/fotos/…</td><td>As fotos dos treinos, uma por arquivo. Nunca são públicas: o app recebe um link que vale 7 dias.</td></tr>
            <tr><td>tapago/diag.json</td><td>Diagnóstico do login (só nomes de campos, nada pessoal).</td></tr>
          </tbody>
        </table>
        <p className="obs"><b>Quando trocar:</b> com alguns milhares de pessoas ativas ao mesmo tempo, o ideal é migrar pra um banco de verdade (Postgres, pela Vercel ou Supabase). O código já concentra o acesso ao banco num lugar só, então a troca é localizada.</p>
      </Secao>

      <Secao id="login" t="6. Login e quem é quem">
        <Fatos itens={[
          ["Como entra", "A pessoa não digita nada: o miniapp pega nome, foto e user ID (PhizID) do PhizChat sozinho."],
          ["Hoje", "Login em modo de teste: o servidor confia no aparelho. O login oficial da PhizClip (troca de um código pelo ID verificado) já está pronto no código; falta a plataforma liberar a chave."],
          ["Depois de entrar", "O servidor devolve um \"crachá\" assinado (token) que o app manda em toda chamada. Sem crachá válido, nada acontece."],
          ["Admin", "Este painel tem senha própria e um crachá que vale 30 dias."],
        ]} />
      </Secao>

      <Secao id="integracoes" t="7. Serviços conectados">
        <table className="tab">
          <thead><tr><th>Serviço</th><th>Pra quê</th><th>Como conversa</th><th>Custo e limites</th></tr></thead>
          <tbody>
            <tr><td>Strava</td><td>Treino entra sozinho quando a pessoa termina a atividade.</td><td>A pessoa autoriza no Strava; depois o Strava avisa nosso servidor a cada atividade nova (webhook).</td><td>Grátis. Aprovado pra até 10 atletas; pedido de aumento já preparado. Regras de marca e de privacidade do Strava.</td></tr>
            <tr><td>Claude (Anthropic)</td><td>Confere se a foto é mesmo de treino. Bloqueia foto de sofá.</td><td>O servidor manda a foto e recebe ok, dúvida ou recusada.</td><td>≈ US$ 0,0115 por foto. 100 pessoas com 1 foto por dia ≈ US$ 35 por mês.</td></tr>
            <tr><td>Bot do PhizChat</td><td>Mensagens no chat: boas-vindas, treino, resumo das 17h, cutucada, pódio.</td><td>Business API do PhizChat, pelo telefone da pessoa.</td><td>Sem custo. Cerca de 10 mensagens por pessoa por dia. Ainda não avisa se a mensagem foi lida.</td></tr>
            <tr><td>OpenAPI do PhizChat</td><td>Postar nos Moments pela conta oficial.</td><td>Servidor → API da plataforma.</td><td>Parado: o endereço de testes não abre fora da rede da empresa.</td></tr>
            <tr><td>OpenFreeMap + Nominatim</td><td>Mapa de fundo da corrida (sem nomes de rua) e o nome do bairro.</td><td>Servidor busca os dados do OpenStreetMap e desenha o mapa.</td><td>Grátis, sem chave.</td></tr>
            <tr><td>Vercel</td><td>Hospedagem, arquivos, rotinas e segredos.</td><td>—</td><td>Plano Pro do time da empresa.</td></tr>
          </tbody>
        </table>
      </Secao>

      <Secao id="artes" t="8. As artes e os cards">
        <Fatos itens={[
          ["Arte de post", "Imagem 1080×1350 desenhada pelo servidor na hora (next/og): foto, mapa ou número gigante, com a marca e o \"Powered by Strava\" quando vem de lá."],
          ["Card com mapa", "O servidor desenha as ruas, aplica o verde e laranja e traça a rota. A rota perde 250 m de cada ponta pra não mostrar onde a pessoa mora."],
          ["Ícones", "Phosphor Icons (biblioteca aberta, licença MIT)."],
          ["Fontes", "Unbounded nos números e títulos; Inter e a fonte do sistema no resto."],
        ]} />
      </Secao>

      <Secao id="seguranca" t="9. Segurança e privacidade">
        <ul className="pontos">
          <li>Chaves e senhas nunca ficam no código: ficam nos segredos da Vercel.</li>
          <li>Fotos ficam privadas; o app só vê por link assinado que expira.</li>
          <li>O @ do PhizChat nunca aparece em tela nenhuma.</li>
          <li>As chaves do Strava de cada pessoa ficam só no servidor; detalhes de atividade do Strava somem depois de 7 dias.</li>
          <li>Perfil público e "quem pode ver" são escolhas da pessoa; os pontos contam sempre.</li>
          <li>O webhook do Strava e o do bot conferem assinatura antes de aceitar qualquer aviso; sem segredo configurado, recusam tudo.</li>
          <li>O id de cada pessoa é aleatório e não serve pra entrar. O que prova quem é a pessoa fica guardado só como código embaralhado (HMAC), mais um segredo que nasce e fica só no celular dela.</li>
          <li>Telefone, @, PhizID, chaves de login e tokens do Strava nunca saem do servidor pra outras pessoas.</li>
          <li>A pessoa pode apagar a conta nos Ajustes: treinos, fotos, pontos, troféus, grupos e Strava somem de verdade, sem lixeira.</li>
          <li>Admin com senha forte, só pra quem é do time, e bloqueio de 15 min depois de 5 tentativas erradas. Admin e API nunca ficam em cache e o admin não abre dentro de outro site.</li>
          <li>HTTPS obrigatório (HSTS) em todo o domínio. O código fica no GitHub privado, sem senha, App ID ou dado de ninguém.</li>
        </ul>
      </Secao>

      <Secao id="pendencias" t="10. O que ainda depende de alguém">
        <table className="tab">
          <thead><tr><th>O quê</th><th>Por quê</th><th>Com quem</th></tr></thead>
          <tbody>
            <tr><td>Login oficial da PhizClip</td><td>Hoje o ID vem do aparelho; o oficial vem verificado.</td><td>Time da plataforma (China)</td></tr>
            <tr><td>Aviso de "lida" do bot</td><td>Pra medir quem leu cada mensagem.</td><td>Time da plataforma</td></tr>
            <tr><td>Postar nos Moments da pessoa</td><td>O miniapp ainda não tem essa função.</td><td>Time da plataforma</td></tr>
            <tr><td>Mais atletas no Strava</td><td>Limite atual de 10.</td><td>Strava (formulário de capacidade)</td></tr>
          </tbody>
        </table>
      </Secao>

      <Secao id="glossario" t="Glossário rápido">
        <dl className="glos">
          <dt>API</dt><dd>A &quot;porta&quot; do servidor: o app pede algo e recebe a resposta.</dd>
          <dt>Webhook</dt><dd>Quando outro sistema avisa a gente sozinho (ex.: o Strava avisando que tem treino novo).</dd>
          <dt>Deploy</dt><dd>Publicar uma versão nova do servidor.</dd>
          <dt>Token</dt><dd>Um crachá digital assinado que prova quem está chamando.</dd>
          <dt>Blob</dt><dd>Espaço de arquivos na nuvem da Vercel.</dd>
          <dt>Cron</dt><dd>Tarefa com horário marcado (ex.: resumo das 17h).</dd>
          <dt>Função serverless</dt><dd>Código que só liga quando é chamado: paga pelo uso e não precisa de manutenção de servidor.</dd>
        </dl>
      </Secao>
    </main>
  );
}

function Secao({ id, t, children }: { id: string; t: string; children: React.ReactNode }) {
  return <section id={id}><h2>{t}</h2>{children}</section>;
}

function Fatos({ itens }: { itens: [string, React.ReactNode][] }) {
  return <dl className="fatos">{itens.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

function Card({ t, d }: { t: string; d: string }) {
  return <div className="card"><h3>{t}</h3><p className="sub" style={{ fontSize: 13, lineHeight: 1.5 }}>{d}</p></div>;
}
