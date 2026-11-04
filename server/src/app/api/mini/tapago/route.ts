import { NextResponse } from "next/server";
import { darTaPago } from "@/lib/acoes";
import { exigir, falha } from "../_util";

export async function POST(req: Request) {
  const uid = exigir(req);
  if (typeof uid !== "string") return uid;
  try {
    const { para } = (await req.json().catch(() => ({}))) as { para?: string };
    await darTaPago(uid, String(para || ""));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return falha(e);
  }
}
