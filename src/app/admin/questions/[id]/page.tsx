"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IMAGE_BUCKET, INDEX, SUBJECTS, TOPICS, TRAPS, fetchQuestions, imageUrl } from "@/lib/content";
import { ID_PATTERN, STATUS_LABEL, describeDbError, normalizeQuestion, validateImport } from "@/lib/admin";
import { useContent } from "@/lib/data/ContentProvider";
import { browserClient } from "@/lib/supabase/client";
import type { Question, QuestionStatus, Report } from "@/lib/types";
import { Button, Card, EmptyState, Heading, Loading, Notice, inputClasses, textareaClasses } from "@/components/ui";
import { AdminGuard } from "../../AdminGuard";
import { ReportItem } from "../../ReportItem";

const LETTERS = ["A", "B", "C", "D", "E"] as const;
const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function AdminQuestion() {
  return (
    <AdminGuard>
      <QuestionEditor />
    </AdminGuard>
  );
}

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 text-[13px] font-semibold ${wide ? "col-span-full" : ""}`}>
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-ink-3">{hint}</span>}
    </label>
  );
}

function QuestionEditor() {
  const routeId = decodeURIComponent(useParams<{ id: string }>().id);
  const isNew = routeId === "new";
  const router = useRouter();
  const { reload } = useContent();
  const [form, setForm] = useState<Question | null>(isNew ? normalizeQuestion({ subject: SUBJECTS[0]?.id ?? "" }) : null);
  const [notFound, setNotFound] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [imageVersion, setImageVersion] = useState(0);

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    fetchQuestions([routeId]).then(([q]) => {
      if (!alive) return;
      if (q) setForm(normalizeQuestion(q));
      else setNotFound(true);
    });
    browserClient()
      .from("reports")
      .select("*")
      .eq("question_id", routeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => alive && setReports((data ?? []) as Report[]));
    return () => {
      alive = false;
    };
  }, [routeId, isNew]);

  if (notFound) return <EmptyState title="Questão não encontrada">Confira o id ou volte para a lista.</EmptyState>;
  if (!form) return <Loading />;

  const set = <K extends keyof Question>(key: K, value: Question[K]) => {
    setSaved(false);
    setForm({ ...form, [key]: value });
  };
  const setLetter = (key: "options" | "distractors", letter: string, value: string) => set(key, { ...form[key], [letter]: value });
  const topics = TOPICS.filter((t) => t.subject === form.subject);

  // Empty letters are dropped so a 4-option question stays with 4 options.
  const cleaned = (): Question => {
    const compact = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v.trim() !== ""));
    return { ...form, id: form.id.trim(), year: form.year.trim(), options: compact(form.options), distractors: compact(form.distractors), passage: form.passage?.trim() ? form.passage : null };
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const row = cleaned();
    const problems = validateImport({ questions: [row] }).errors.map((m) => m.replace(/^questões\[0\]( \([^)]*\))?: /, ""));
    if (isNew && INDEX.some((q) => q.id === row.id)) problems.unshift("Já existe uma questão com esse id.");
    setErrors(problems);
    if (problems.length) return;
    setSaving(true);
    const sb = browserClient();
    const { id, ...fields } = row;
    const { error } = isNew ? await sb.from("questions").insert(row) : await sb.from("questions").update(fields).eq("id", id);
    setSaving(false);
    if (error) return setErrors([describeDbError(error)]);
    await reload();
    setSaved(true);
    if (isNew) router.replace(`/admin/questions/${encodeURIComponent(row.id)}`);
  };

  const upload = async (file: File) => {
    const ext = IMAGE_TYPES[file.type];
    const id = form.id.trim();
    if (!ext) return setErrors(["A imagem precisa ser PNG, JPG ou WEBP."]);
    if (file.size > MAX_IMAGE_BYTES) return setErrors(["A imagem passa de 5 MB."]);
    if (!ID_PATTERN.questions.test(id)) return setErrors(["Preencha um id válido antes de enviar a imagem."]);
    setUploading(true);
    setErrors([]);
    const sb = browserClient();
    const path = `${id}.${ext}`;
    const up = await sb.storage.from(IMAGE_BUCKET).upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setUploading(false);
      return setErrors([describeDbError(up.error)]);
    }
    // An existing question gets the image right away, so the upload is never orphaned.
    if (!isNew) {
      const { error } = await sb.from("questions").update({ image: path }).eq("id", id);
      if (error) {
        setUploading(false);
        return setErrors([describeDbError(error)]);
      }
    }
    setUploading(false);
    setImageVersion(Date.now());
    setForm({ ...form, image: path });
  };

  const removeImage = async () => {
    if (!isNew) {
      const { error } = await browserClient().from("questions").update({ image: null }).eq("id", form.id);
      if (error) return setErrors([describeDbError(error)]);
    }
    setForm({ ...form, image: null });
  };

  const remove = async () => {
    if (!confirm(`Apagar a questão ${form.id}? As respostas já dadas continuam no histórico.`)) return;
    const { error } = await browserClient().from("questions").delete().eq("id", form.id);
    if (error) return setErrors([describeDbError(error)]);
    await reload();
    router.push("/admin/questions");
  };

  const preview = imageUrl(form.image);

  return (
    <form onSubmit={save} className="flex flex-col gap-6">
      <nav aria-label="Caminho" className="text-[13px] text-ink-3">
        <Link href="/admin/questions" className="hover:underline">Questões</Link> › {isNew ? "Nova" : form.id}
      </nav>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold">{isNew ? "Nova questão" : `Questão ${form.id}`}</h1>
        {!isNew && <Button variant="danger" onClick={remove}>Apagar questão</Button>}
      </header>

      <Card className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 p-5">
        <Field label="Id" hint={isNew ? "Letras, números, hífen e sublinhado. Ex.: 2026-001" : "O id não muda depois de criado."}>
          <input className={inputClasses} value={form.id} disabled={!isNew} required onChange={(e) => set("id", e.target.value)} />
        </Field>
        <Field label="Ano da prova" hint='Ex.: 2025 ou 2024r'>
          <input className={inputClasses} value={form.year} required onChange={(e) => set("year", e.target.value)} />
        </Field>
        <Field label="Número na prova">
          <input type="number" min={0} className={inputClasses} value={form.number} onChange={(e) => set("number", Number(e.target.value) || 0)} />
        </Field>
        <Field label="Fonte">
          <input className={inputClasses} value={form.source} onChange={(e) => set("source", e.target.value)} placeholder="TJSP 2025 versão 1" />
        </Field>
        <Field label="Matéria">
          <select className={inputClasses} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value, topic: "" })}>
            {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Tópico">
          <select className={inputClasses} value={form.topic} required onChange={(e) => set("topic", e.target.value)}>
            <option value="">Escolha…</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Subtópico">
          <input className={inputClasses} value={form.subtopic} onChange={(e) => set("subtopic", e.target.value)} />
        </Field>
        <Field label="Artigos de lei">
          <input className={inputClasses} value={form.legal_refs} onChange={(e) => set("legal_refs", e.target.value)} placeholder="CP, art. 312, § 3º" />
        </Field>
        <Field label="Dificuldade">
          <select className={inputClasses} value={form.difficulty} onChange={(e) => set("difficulty", Number(e.target.value))}>
            <option value={1}>1 · fácil</option>
            <option value={2}>2 · média</option>
            <option value={3}>3 · difícil</option>
          </select>
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <Heading>Enunciado e alternativas</Heading>
        <Field label="Texto de apoio" hint="Opcional. Use quando várias questões partem do mesmo texto.">
          <textarea className={textareaClasses} rows={5} value={form.passage ?? ""} onChange={(e) => set("passage", e.target.value)} />
        </Field>
        <Field label="Enunciado">
          <textarea className={textareaClasses} rows={4} required value={form.statement} onChange={(e) => set("statement", e.target.value)} />
        </Field>
        {LETTERS.map((l) => (
          <Field key={l} label={`Alternativa ${l}`}>
            <input className={inputClasses} value={form.options[l] ?? ""} onChange={(e) => setLetter("options", l, e.target.value)} />
          </Field>
        ))}
        <Field label="Gabarito">
          <select className={`${inputClasses} sm:max-w-60`} value={form.answer} onChange={(e) => set("answer", e.target.value as Question["answer"])}>
            {LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
            <option value="N">Anulada (todas contam)</option>
          </select>
        </Field>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <Heading>Comentário</Heading>
        <Field label="Explicação" hint="Por que a correta está correta.">
          <textarea className={textareaClasses} rows={4} value={form.explanation} onChange={(e) => set("explanation", e.target.value)} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[13px] font-semibold">Tipos de pegadinha</legend>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {TRAPS.map((t) => (
              <label key={t.id} className="flex items-start gap-2 text-[13px]" title={t.description}>
                <input type="checkbox" className="mt-0.5" checked={form.traps.includes(t.id)} onChange={(e) => set("traps", e.target.checked ? [...form.traps, t.id] : form.traps.filter((x) => x !== t.id))} />
                {t.name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Onde está a pegadinha">
          <textarea className={textareaClasses} rows={2} value={form.trap_note} onChange={(e) => set("trap_note", e.target.value)} />
        </Field>
        {LETTERS.map((l) => (
          <Field key={l} label={`Por que a ${l} está errada`} hint={l === form.answer ? "Esta é a correta; pode deixar em branco." : undefined}>
            <textarea className={textareaClasses} rows={2} value={form.distractors[l] ?? ""} onChange={(e) => setLetter("distractors", l, e.target.value)} />
          </Field>
        ))}
        <Field label="Macete">
          <input className={inputClasses} value={form.tip} onChange={(e) => set("tip", e.target.value)} />
        </Field>
      </Card>

      <Card className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 p-5">
        <Heading className="col-span-full">Situação e imagem</Heading>
        <Field label="Situação" hint="Anuladas saem dos treinos. Desatualizadas aparecem com aviso.">
          <select className={inputClasses} value={form.status} onChange={(e) => set("status", e.target.value as QuestionStatus)}>
            {(Object.keys(STATUS_LABEL) as QuestionStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Field>
        <Field label="Nota sobre a situação" hint="Aparece para quem estuda depois de responder.">
          <input className={inputClasses} value={form.status_note} onChange={(e) => set("status_note", e.target.value)} />
        </Field>
        <Field label="Página na prova original">
          <input type="number" min={0} className={inputClasses} value={form.page ?? ""} onChange={(e) => set("page", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
        <Field label="Coluna na página" hint="L (esquerda) ou R (direita)">
          <input className={inputClasses} value={form.page_side ?? ""} onChange={(e) => set("page_side", e.target.value.trim() || null)} />
        </Field>
        <label className="col-span-full flex items-center gap-2 text-[13px] font-semibold">
          <input type="checkbox" checked={form.needs_image} onChange={(e) => set("needs_image", e.target.checked)} />
          A questão depende de uma figura
        </label>
        <div className="col-span-full flex flex-col gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageVersion ? `${preview}?v=${imageVersion}` : preview} alt={`Imagem da questão ${form.id}`} className="max-h-[50vh] w-auto self-start rounded-[10px] border border-line" />
          ) : (
            <p className="text-[13px] text-ink-3">{form.needs_image ? "Falta a imagem desta questão." : "Sem imagem."}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center rounded-button border border-line-strong px-4 text-[13px] font-semibold text-ink-strong hover:bg-sidebar">
              {uploading ? "Enviando…" : preview ? "Trocar imagem" : "Enviar imagem"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </label>
            {preview && <Button variant="secondary" onClick={removeImage}>Tirar imagem da questão</Button>}
            <span className="text-xs text-ink-3">PNG, JPG ou WEBP até 5 MB.</span>
          </div>
        </div>
      </Card>

      {errors.length > 0 && (
        <Notice tone="danger">
          <ul className="list-disc pl-4">
            {errors.map((m) => <li key={m}>{m}</li>)}
          </ul>
        </Notice>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="l" disabled={saving}>{saving ? "Salvando…" : isNew ? "Criar questão" : "Salvar"}</Button>
        {saved && <span role="status" className="text-[13px] font-semibold text-success">Salvo.</span>}
      </div>

      {!isNew && (
        <section aria-labelledby="reports" className="flex flex-col gap-3">
          <Heading id="reports">Reportes desta questão</Heading>
          {reports.length === 0 ? (
            <EmptyState title="Nenhum reporte">Quando alguém apontar um problema, ele aparece aqui.</EmptyState>
          ) : (
            <div className="flex flex-col divide-y divide-line rounded-card border border-line">
              {reports.map((r) => (
                <ReportItem key={r.id} report={r} onChanged={(n) => setReports((list) => list.map((x) => (x.id === n.id ? n : x)))} />
              ))}
            </div>
          )}
        </section>
      )}
    </form>
  );
}
