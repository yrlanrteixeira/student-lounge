"use client";

import { useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { Logo } from "@/components/icons";
import { Button } from "@/components/ui";

const fieldClasses = "h-11 w-full rounded-button border border-line-strong bg-surface px-3 text-sm outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-100";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await browserClient().auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) setError("E-mail ou senha incorretos.");
    else window.location.href = "/";
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <form onSubmit={signIn} className="flex w-full max-w-sm flex-col gap-5 rounded-frame border border-line bg-surface p-7 shadow-frame">
        <div className="flex items-center gap-2.5">
          <Logo />
          <span className="text-base font-bold">Rumo ao TJSP</span>
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Entrar</h1>
          <p className="text-[13px] text-ink-2">Escrevente Técnico Judiciário · prova em 14/03/2027</p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          E-mail
          <input type="email" autoComplete="email" required className={fieldClasses} value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Senha
          <input type="password" autoComplete="current-password" required className={fieldClasses} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p role="alert" className="text-[13px] font-semibold text-danger">{error}</p>}
        <Button type="submit" size="l" disabled={submitting}>{submitting ? "Entrando…" : "Entrar"}</Button>
      </form>
    </main>
  );
}
