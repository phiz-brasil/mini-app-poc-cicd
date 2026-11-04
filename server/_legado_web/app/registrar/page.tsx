import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import { Registrar } from "@/components/Registrar";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  return <Registrar destaques={u.destaques} />;
}
