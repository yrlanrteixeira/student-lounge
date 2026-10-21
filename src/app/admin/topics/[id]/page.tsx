"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { INDEX, SUBJECTS, topicById } from "@/lib/content";
import { ID_PATTERN, PRIORITY_LABEL, describeDbError, normalizeTopic } from "@/lib/admin";
import { useContent } from "@/lib/data/ContentProvider";
import { browserClient } from "@/lib/supabase/client";
import type { Priority, Topic } from "@/lib/types";
import { Button, Card, EmptyState, Heading, Notice, SimpleMarkdown, inputClasses, textareaClasses } from "@/components/ui";
import { AdminGuard } from "../../AdminGuard";

export default function AdminTopic() {
  return (
    <AdminGuard>
      <TopicEditor />
    </AdminGuard>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-ink-3">{hint}</span>}
    </label>
  );
}

const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

function TopicEditor() {
  const routeId = decodeURIComponent(useParams<{ id: string }>().id);
  const isNew = routeId === "new";
  const existing = topicById[routeId];
  const router = useRouter();
  const { reload } = useContent();
  const [form, setForm] = useState<Topic>(() => normalizeTopic(existing ?? { subject: SUBJECTS[0]?.id ?? "" }));
  // Lists are edited as plain text and parsed on save, so blank lines while typing don't vanish.
  const [memorize, setMemorize] = useState(form.memorize.join("\n"));
  const [commonTraps, setCommonTraps] = useState(form.common_traps.join("\n"));
  const [years, setYears] = useState(form.years.join(", "));
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isNew && !existing) return <EmptyState title="Tópico não encontrado">Confira o id ou volte para a lista.</EmptyState>;

  const set = <K extends keyof Topic>(key: K, value: Topic[K]) => {
    setSaved(false);
    setForm({ ...form, [key]: value });
  };
  const questionCount = INDEX.filter((q) => q.topic === form.id).length;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const row: Topic = {
      ...form,
      id: form.id.trim(),
      name: form.name.trim(),
      memorize: lines(memorize),
      common_traps: lines(commonTraps),
      years: years.split(",").map((y) => y.trim()).filter(Boolean),
    };
    const problems: string[] = [];
    if (!ID_PATTERN.topics.test(row.id)) problems.push("O id precisa ter o formato prefixo.nome, só com letras minúsculas, números e sublinhado. Ex.: pen.peculato");
    if (isNew && topicById[row.id]) problems.push("Já existe um tópico com esse id.");
    if (!row.name) problems.push("Preencha o nome.");
    setErrors(problems);
    if (problems.length) return;
    setSaving(true);
    const sb = browserClient();
    const { id, ...fields } = row;
    const { error } = isNew ? await sb.from("topics").insert(row) : await sb.from("topics").update(fields).eq("id", id);
    setSaving(false);
    if (error) return setErrors([describeDbError(error)]);
    await reload();
    setSaved(true);
    if (isNew) router.replace(`/admin/topics/${encodeURIComponent(row.id)}`);
  };

  const remove = async () => {
    if (questionCount > 0) return setErrors([`Este tópico tem ${questionCount} questões. Mude o tópico delas antes de apagar.`]);
    if (!confirm(`Apagar o tópico ${form.id}?`)) return;
    const { error } = await browserClient().from("topics").delete().eq("id", form.id);
    if (error) return setErrors([error.code === "23503" ? "Ainda há questões usando este tópico. Mude o tópico delas antes de apagar." : describeDbError(error)]);
    await reload();
    router.push("/admin/topics");
  };

  return (
    <form onSubmit={save} className="mx-auto flex max-w-4xl flex-col gap-6">
      <nav aria-label="Caminho" className="text-[13px] text-ink-3">
        <Link href="/admin/topics" className="hover:underline">Tópicos</Link> › {isNew ? "Novo" : form.id}
      </nav>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold">{isNew ? "Novo tópico" : form.name}</h1>
        <div className="flex flex-wrap gap-2">
          {!isNew && <Link href={`/syllabus/${encodeURIComponent(form.id)}`} target="_blank" className="inline-flex min-h-10 items-center px-1 text-[13px] font-semibold text-brand-700 hover:underline">Ver como quem estuda</Link>}
          {!isNew && <Button variant="danger" onClick={remove}>Apagar tópico</Button>}
        </div>
      </header>

      <Card className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 p-5">
        <Field label="Id" hint={isNew ? "Formato prefixo.nome. Ex.: pen.peculato" : `O id não muda depois de criado. ${questionCount} questões usam este tópico.`}>
          <input className={inputClasses} value={form.id} disabled={!isNew} required onChange={(e) => set("id", e.target.value)} />
        </Field>
        <Field label="Matéria">
          <select className={inputClasses} value={form.subject} onChange={(e) => set("subject", e.target.value)}>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Prioridade">
          <select className={inputClasses} value={form.priority} onChange={(e) => set("priority", e.target.value as Priority)}>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
          </select>
        </Field>
        <div className="col-span-full">
          <Field label="Nome">
            <input className={inputClasses} value={form.name} required onChange={(e) => set("name", e.target.value)} />
          </Field>
        </div>
        <Field label="Nome curto" hint="Usado em listas e etiquetas.">
          <input className={inputClasses} value={form.short_name} onChange={(e) => set("short_name", e.target.value)} />
        </Field>
        <Field label="Item do edital" hint="Ex.: itens 1–3">
          <input className={inputClasses} value={form.syllabus_ref} onChange={(e) => set("syllabus_ref", e.target.value)} />
        </Field>
        <Field label="Quantas vezes caiu">
          <input type="number" min={0} className={inputClasses} value={form.occurrences} onChange={(e) => set("occurrences", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Em quais provas" hint="Separadas por vírgula. Ex.: 2021, 2024r, 2025">
          <input className={inputClasses} value={years} onChange={(e) => { setSaved(false); setYears(e.target.value); }} />
        </Field>
        <Field label="Ordem" hint="Posição na lista da matéria.">
          <input type="number" className={inputClasses} value={form.position} onChange={(e) => set("position", Number(e.target.value) || 0)} />
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <Heading>Guia</Heading>
        <Field label="Como a Vunesp cobra">
          <textarea className={textareaClasses} rows={5} value={form.how_tested} onChange={(e) => set("how_tested", e.target.value)} />
        </Field>
        <Field label="Decore" hint="Um item por linha.">
          <textarea className={textareaClasses} rows={6} value={memorize} onChange={(e) => { setSaved(false); setMemorize(e.target.value); }} />
        </Field>
        <Field label="Pegadinhas da Vunesp" hint="Um item por linha.">
          <textarea className={textareaClasses} rows={5} value={commonTraps} onChange={(e) => { setSaved(false); setCommonTraps(e.target.value); }} />
        </Field>
        <Field label="Não confunda" hint="Aceita **negrito**, listas com - e tabelas com |.">
          <textarea className={`${textareaClasses} font-mono text-xs`} rows={8} value={form.comparison} onChange={(e) => set("comparison", e.target.value)} />
        </Field>
        {form.comparison.trim() && (
          <div className="flex flex-col gap-2 rounded-card border border-line p-4">
            <span className="text-xs font-semibold text-ink-3">Prévia</span>
            <SimpleMarkdown text={form.comparison} />
          </div>
        )}
      </Card>

      {errors.length > 0 && (
        <Notice tone="danger">
          <ul className="list-disc pl-4">
            {errors.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="l" disabled={saving}>{saving ? "Salvando…" : isNew ? "Criar tópico" : "Salvar"}</Button>
        {saved && <span role="status" className="text-[13px] font-semibold text-success">Salvo.</span>}
      </div>
    </form>
  );
}
