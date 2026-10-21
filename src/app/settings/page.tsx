"use client";

import { useEffect, useState } from "react";
import { useContent } from "@/lib/data/ContentProvider";
import { useUserData } from "@/lib/data/UserDataProvider";
import { SUBJECTS } from "@/lib/content";
import type { Profile } from "@/lib/types";
import { Button, ButtonLink, Card, Heading, Loading, inputClasses } from "@/components/ui";

export default function Settings() {
  const { loading, profile, saveProfile, email, signOut } = useUserData();
  const { isAdmin } = useContent();
  const [p, setP] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => setP(profile), [profile]);
  if (loading) return <Loading />;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(p);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={save} className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Configurações</h1>
        <p className="text-[15px] text-ink-2 sm:text-[17px]">Conta: {email}. O progresso fica salvo na nuvem e sincroniza entre os aparelhos.</p>
      </header>

      <Card className="flex flex-col gap-4 p-5">
        <Heading>Você e a prova</Heading>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Nome
          <input className={inputClasses} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Como quer ser chamada" />
        </label>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Data da prova
            <input type="date" className={inputClasses} value={p.exam_date} onChange={(e) => setP({ ...p, exam_date: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
            Início do cronograma (uma segunda-feira)
            <input type="date" className={inputClasses} value={p.start_date} onChange={(e) => setP({ ...p, start_date: e.target.value })} />
          </label>
        </div>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <Heading>Cadernos do NotebookLM</Heading>
          <p className="text-[13px] text-ink-2">
            Crie um caderno por matéria no NotebookLM, suba o resumo baixado em “Edital mastigado” e cole o link aqui. Os botões “Áudio no NotebookLM” abrem o caderno certo.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Caderno geral
          <input type="url" className={inputClasses} placeholder="https://notebooklm.google.com/notebook/…" value={p.notebooklm.geral ?? ""} onChange={(e) => setP({ ...p, notebooklm: { ...p.notebooklm, geral: e.target.value } })} />
        </label>
        {SUBJECTS.map((s) => (
          <label key={s.id} className="flex flex-col gap-1.5 text-[13px] font-semibold">
            {s.name}
            <input type="url" className={inputClasses} placeholder="https://notebooklm.google.com/notebook/…" value={p.notebooklm[s.id] ?? ""} onChange={(e) => setP({ ...p, notebooklm: { ...p.notebooklm, [s.id]: e.target.value } })} />
          </label>
        ))}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="l">Salvar</Button>
        {saved && <span role="status" className="text-[13px] font-semibold text-success">Salvo.</span>}
      </div>

      {isAdmin && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-1">
            <Heading>Administração</Heading>
            <p className="text-[13px] text-ink-2">Cadastre, importe e corrija questões, tópicos e reportes.</p>
          </div>
          <ButtonLink href="/admin" variant="secondary" className="self-start">Abrir administração</ButtonLink>
        </Card>
      )}

      <Button variant="secondary" className="self-start" onClick={signOut}>Sair da conta</Button>
    </form>
  );
}
