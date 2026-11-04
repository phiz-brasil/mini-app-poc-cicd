import { redirect } from "next/navigation";
import { lerBanco, armazenamentoConfigurado, publico } from "@/lib/store";
import { uidAtual } from "@/lib/sessao";
import { rankingDaSemana, rankingDoDia, sequencia } from "@/lib/ranking";
import { diaSP } from "@/lib/tipos";
import { Home } from "@/components/Home";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ ok?: string; d?: string }> }) {
  if (!armazenamentoConfigurado()) return <div className="aviso-config">Falta configurar o armazenamento (BLOB_READ_WRITE_TOKEN).</div>;
  const uid = await uidAtual();
  const b = await lerBanco();
  if (!uid || !b.usuarios[uid]) redirect("/entrar");
  const dia = diaSP();
  const sp = await searchParams;
  return (
    <Home
      eu={publico(b.usuarios[uid])}
      hoje={rankingDoDia(b, dia, uid)}
      semana={rankingDaSemana(b, dia, uid)}
      seq={sequencia(b, uid, dia)}
      total={Object.values(b.usuarios).filter(u => u.aparecer).length}
      aviso={sp.ok ? (sp.d === "publicado" ? "Treino no ranking ✅ e nos destaques do Tá Pago!" : "Treino com foto no ranking ✅") : undefined}
    />
  );
}
