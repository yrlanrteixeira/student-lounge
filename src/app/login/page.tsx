"use client";

import { useState, type ReactNode } from "react";
import { browserClient } from "@/lib/supabase/client";
import { LockIcon, Logo, MailIcon } from "@/components/icons";

function Field({ id, label, icon, children }: { id: string; label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="grid h-[52px] w-full grid-cols-[48px_1fr] items-center rounded-[12px] border border-line-strong bg-surface transition-shadow focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-600/15">
      <label htmlFor={id} className="flex justify-center text-ink-3">
        {icon}
        <span className="sr-only">{label}</span>
      </label>
      {children}
    </div>
  );
}

// The field's focus-within ring is the focus indicator, so the global outline is turned off here.
const inputClasses = "h-full w-full bg-transparent pr-4 text-[17px] text-ink outline-none focus-visible:outline-none placeholder:text-ink-3";

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
      <div className="relative w-full max-w-[900px] overflow-hidden rounded-frame bg-surface shadow-frame md:h-[540px]">
        {/* The brand circle: above the form on phones, a curved left half on wider screens. */}
        <div
          aria-hidden
          className="absolute left-1/2 top-[-1250px] h-[1500px] w-[1500px] -translate-x-1/2 rounded-full bg-brand-700 md:left-auto md:right-[48%] md:top-[-10%] md:h-[2000px] md:w-[2000px] md:translate-x-0 md:-translate-y-1/2"
        />

        <div className="relative grid md:h-full md:grid-cols-2">
          <section className="flex h-[250px] flex-col items-center justify-center gap-3 px-8 text-center text-white md:h-auto md:items-start md:px-12 md:text-left">
            <Logo className="h-14 w-14 text-white md:h-20 md:w-20" />
            <h2 className="text-[28px] font-semibold leading-tight tracking-tight">Rumo ao TJSP</h2>
            <p className="max-w-[280px] text-[15px] leading-relaxed text-white/80">Que bom ter você de volta. Sua preparação continua de onde parou.</p>
          </section>

          <form onSubmit={signIn} className="mx-auto flex w-full max-w-[380px] flex-col justify-center gap-3 px-6 pb-10 pt-8 md:px-0 md:py-0">
            <div className="mb-3 flex flex-col gap-1.5 text-center">
              <h1 className="text-[32px] font-semibold leading-tight tracking-tight text-ink">Entrar</h1>
              <p className="text-[15px] text-ink-2">Use o e-mail e a senha da sua conta.</p>
            </div>
            <Field id="email" label="E-mail" icon={<MailIcon />}>
              <input id="email" type="email" autoComplete="email" required placeholder="E-mail" className={inputClasses} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field id="password" label="Senha" icon={<LockIcon />}>
              <input id="password" type="password" autoComplete="current-password" required placeholder="Senha" className={inputClasses} value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <p role="alert" className="text-center text-[13px] font-medium text-danger">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="mt-3 h-12 w-full rounded-pill bg-brand-700 text-[17px] font-medium text-white transition-colors hover:bg-brand-800 active:bg-brand-900 disabled:cursor-not-allowed disabled:bg-line disabled:text-disabled"
            >
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
