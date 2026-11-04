import { registrarDiag } from "@/lib/diag";
import { lerBanco, publico } from "@/lib/store";
import { chaveDe, novoUid, segredoDe, uidPelaChave } from "@/lib/ids";
import { after, NextResponse } from "next/server";
import { alterarBanco } from "@/lib/store";
import { boasVindas, telefoneDaLista } from "@/lib/mensagens";
import { garantirUsuario, type PerfilPhiz } from "@/lib/acoes";
import { criarToken } from "@/lib/mini-sessao";
import { phizclipConfigurado, trocarCode } from "@/lib/phizclip-auth";
import { falha } from "../_util";

export const dynamic = "force-dynamic";

/**
 * Entrada do miniapp nativo.
 *
 *   { code, perfil }  → pz.login. O servidor troca na PhizClip e o uid é o openId.
 *   { devId, perfil } → SÓ com MINI_DEV_LOGIN=1: modo teste do PhizClip Studio,
 *                       enquanto o servidor da PhizClip não está configurado.
 *
 * `perfil` = o que o miniapp conseguiu do PhizChat sem perguntar nada (nome,
 * foto, idioma). Serve só pra exibir; quem diz QUEM é a pessoa é o code.
 * Nunca pergunta o nome: sem nome, vira "Atleta". Devolve um token assinado.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { code?: string; devId?: string; segredo?: string; perfil?: PerfilPhiz; diag?: { apiserver?: string; temCode?: boolean; campos?: Record<string, unknown> } };
  // Diagnóstico: o que o pz.login devolveu (o apiserver revela o servidor da PhizClip).
  // Só vai pro log — nunca é usado pra trocar o code (passa pela mão do cliente).
  registrarDiag({ em: new Date().toISOString(), temCode: !!b.code, apiserver: String(b.diag?.apiserver || "").slice(0, 200),
    campos: Object.keys(b.diag?.campos || {}).slice(0, 40), perfil: { nome: !!b.perfil?.nome, avatar: !!b.perfil?.avatar, idioma: b.perfil?.idioma || "" } }).catch(() => {});
  console.log("[mini/auth]", JSON.stringify({ temCode: !!b.code, apiserver: String(b.diag?.apiserver || "").slice(0, 200), perfil: { nome: !!b.perfil?.nome, avatar: !!b.perfil?.avatar, idioma: b.perfil?.idioma || "" } }));
  try {
    let credencial = "";
    let modo = "";
    if (b.code && phizclipConfigurado()) {
      const { openId, perfil } = await trocarCode(b.code);
      // O que o servidor da PhizClip disser vale mais que o que veio do aparelho.
      b.perfil = { ...(b.perfil || {}), ...perfil };
      credencial = "pz:" + openId;
      modo = "phizclip";
    } else if (process.env.MINI_DEV_LOGIN === "1" && b.devId && /^[a-f0-9]{16,32}$/.test(b.devId)) {
      credencial = "dev:" + b.devId;
      modo = "teste";
    }
    if (!credencial) {
      return NextResponse.json({ ok: false, erro: "Login do PhizChat ainda não está disponível." }, { status: 503 });
    }
    // A credencial vira só um HMAC; o id da pessoa é aleatório e não serve pra entrar.
    const chave = chaveDe(credencial);
    const banco = await lerBanco();
    // Durante a troca de ids (migração única), quem tem conta antiga espera em vez de ganhar uma conta nova.
    const antigo = credencial.startsWith("dev:") ? "dev_" + credencial.slice(4) : "pz_" + credencial.slice(3).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    if (banco.usuarios[antigo]) return NextResponse.json({ ok: false, erro: "Atualizando o Tá Pago!. Tente de novo em 1 minuto." }, { status: 503 });
    const uid = uidPelaChave(banco, chave) || novoUid();
    // Segredo do aparelho: se a conta já tem um, tem que bater; se não tem, amarra agora.
    const seg = b.segredo && /^[a-f0-9]{64}$/.test(b.segredo) ? segredoDe(b.segredo) : "";
    const ja = banco.usuarios[uid];
    if (modo === "teste") {
      if (ja?.segredo && ja.segredo !== seg) return NextResponse.json({ ok: false, erro: "Não deu pra entrar." }, { status: 401 });
      if (!seg && process.env.LOGIN_EXIGE_SEGREDO === "1") return NextResponse.json({ ok: false, erro: "Atualize o Tá Pago!." }, { status: 426 });
    }
    let { usuario, novo } = await garantirUsuario(uid, b.perfil || {}, chave, modo === "teste" ? seg : "");
    // Beta: liga o telefone pela lista PhizID→telefone e manda as boas-vindas uma vez.
    const tel = telefoneDaLista(usuario.phizId);
    if (tel && !usuario.telefone && usuario.avisos !== false) {
      usuario = await alterarBanco(x => { const u = x.usuarios[uid]; u.telefone = tel; return u; });
      after(() => boasVindas(usuario).catch(e => console.error("[boas-vindas]", e)));
    }
    return NextResponse.json({ ok: true, modo, novo, token: criarToken(uid), usuario: publico(usuario) });
  } catch (e) {
    return falha(e);
  }
}
