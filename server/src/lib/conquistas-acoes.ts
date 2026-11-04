import { alterarBanco, lerBanco } from "./store";
import { lerCampanhas, novasConquistas, type Conquista } from "./campanhas";

/**
 * Dá as conquistas que a pessoa acabou de cumprir (grava na conta) e devolve as novas.
 * Chamado ao abrir o app (painel) e depois de cada treino (app e Strava). Só grava se tiver novidade.
 */
export async function concederConquistas(uid: string): Promise<Conquista[]> {
  const { conquistas } = await lerCampanhas();
  const b0 = await lerBanco();
  const u0 = b0.usuarios[uid];
  if (!u0 || !novasConquistas(conquistas, b0, u0).length) return [];
  return alterarBanco(b => {
    const u = b.usuarios[uid];
    if (!u) return [];
    const novas = novasConquistas(conquistas, b, u);
    const em = new Date().toISOString();
    u.conquistas = [...(u.conquistas || []), ...novas.map(c => ({ id: c.id, em }))];
    return novas;
  });
}

/** A pessoa viu a comemoração dessa conquista no app. */
export async function marcarConquistaVista(uid: string, id: string) {
  await alterarBanco(b => { const c = b.usuarios[uid]?.conquistas?.find(x => x.id === id); if (c) c.vista = true; });
}

/** Admin: dá ou tira uma conquista de alguém (teste). */
export async function darConquista(uid: string, id: string, dar: boolean) {
  return alterarBanco(b => {
    const u = b.usuarios[uid];
    if (!u) return false;
    const l = (u.conquistas || []).filter(x => x.id !== id);
    u.conquistas = dar ? [...l, { id, em: new Date().toISOString() }] : l;
    return true;
  });
}
