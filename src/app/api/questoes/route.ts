import { NextResponse } from "next/server";
import { questoesPorIds } from "@/lib/conteudo-server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const ids = (url.searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 120);
  return NextResponse.json(questoesPorIds(ids), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
