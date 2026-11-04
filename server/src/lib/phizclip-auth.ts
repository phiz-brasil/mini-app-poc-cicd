/**
 * Trocar o `code` do pz.login por quem a pessoa é — no servidor da PhizClip.
 * Mesmo desenho do PhizChat Releases (src/lib/phizauth.ts de lá):
 *
 *   miniapp: pz.login → code (vida curta)
 *   servidor: POST {PHIZCLIP_API_SERVER}/api/v1/open/dev/mini-apps/unified-auth/login
 *             Authorization: Bearer {PHIZCLIP_PAT}   body { appId, code }  →  { openId, unionId }
 *
 * O endereço é sempre o da variável de ambiente, nunca o `apiserver` que vem
 * no callback do login (passa pela mão do cliente).
 */

const LOGIN = "/api/v1/open/dev/mini-apps/unified-auth/login";

export function phizclipConfigurado(): boolean {
  return Boolean(process.env.PHIZCLIP_API_SERVER && process.env.PHIZCLIP_PAT);
}

export async function trocarCode(code: string): Promise<{ openId: string; unionId: string; perfil: { nome?: string; avatar?: string } }> {
  const server = (process.env.PHIZCLIP_API_SERVER || "").replace(/\/+$/, "");
  const pat = process.env.PHIZCLIP_PAT || "";
  const appId = process.env.PHIZCLIP_APPID || process.env.PHIZ_APP_ID || "";
  if (!server || !pat) throw new Error("PhizClip não configurado no servidor.");
  const r = await fetch(server + LOGIN, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${pat}` },
    body: JSON.stringify({ appId, code }),
    signal: AbortSignal.timeout(15000),
  });
  const j = (await r.json().catch(() => ({}))) as { errcode?: string; error?: string; data?: Record<string, unknown> & { openId?: string; unionId?: string } };
  if (r.status === 401 || r.status === 403) throw new Error("PhizClip recusou o token do servidor.");
  if (!r.ok || (j.errcode && j.errcode !== "OK") || !j.data?.openId) throw new Error(j.error || `Troca do code falhou (${r.status}).`);
  // Se a resposta trouxer perfil (o contrato não garante), aproveita.
  const d = j.data;
  const nome = String(d.nickName || d.nickname || d.userName || d.name || "") || undefined;
  const avatar = String(d.avatarUrl || d.avatar || d.headImg || "") || undefined;
  return { openId: String(d.openId), unionId: String(d.unionId || ""), perfil: { nome, avatar } };
}
