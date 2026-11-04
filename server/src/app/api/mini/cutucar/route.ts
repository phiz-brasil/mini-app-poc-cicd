import { NextResponse } from "next/server";
import { cutucar } from "@/lib/acoes";
import { exigir, falha } from "../_util";

/** { para }: cutuca alguém pra treinar (vira mensagem no chat dela). */
export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const { para } = (await req.json().catch(() => ({}))) as { para?: string };
    return NextResponse.json({ ok: true, ...(await cutucar(uid, String(para || ""))) });
  } catch (e) {
    return falha(e);
  }
}
