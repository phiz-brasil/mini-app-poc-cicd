import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/sessao";
import { publico } from "@/lib/store";
import { Ajustes } from "@/components/Ajustes";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  return <Ajustes usuario={publico(u)} />;
}
