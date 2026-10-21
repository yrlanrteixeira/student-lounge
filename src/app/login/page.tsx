"use client";

import { useState } from "react";
import { supabaseNavegador } from "@/lib/supabase/client";
import { SUPABASE_ATIVO } from "@/lib/supabase/config";
import { Logo } from "@/components/icones";
import { Botao } from "@/components/ui";

const campo = "h-11 w-full rounded-botao border border-borda-forte bg-cartao px-3 text-sm outline-none focus:border-rosa-700 focus:ring-4 focus:ring-rosa-100";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!SUPABASE_ATIVO) {
      window.location.href = "/";
      return;
    }
    setEnviando(true);
    setErro(null);
    const { error } = await supabaseNavegador().auth.signInWithPassword({ email, password: senha });
    setEnviando(false);
    if (error) setErro("E-mail ou senha incorretos.");
    else window.location.href = "/";
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-fundo p-4">
      <form onSubmit={entrar} className="flex w-full max-w-sm flex-col gap-5 rounded-moldura border border-borda bg-cartao p-7 shadow-moldura">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-bold">Rumo ao TJSP</span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Entrar</h1>
          <p className="text-[13px] text-texto-2">Escrevente Técnico Judiciário · prova em 14/03/2027</p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          E-mail
          <input type="email" autoComplete="email" required className={campo} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Senha
          <input type="password" autoComplete="current-password" required className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} />
        </label>
        {erro && <p role="alert" className="text-[13px] font-semibold text-erro">{erro}</p>}
        <Botao type="submit" tamanho="g" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</Botao>
      </form>
    </main>
  );
}
