"use client";

import { useState } from "react";
import { SECTION_LABEL, TEMPLATE, applyImport, parseImport, validateImport, type ImportCheck, type Section } from "@/lib/admin";
import { useContent } from "@/lib/data/ContentProvider";
import { downloadFile } from "@/lib/notebooklm";
import { Button, Card, Heading, Notice, textareaClasses } from "@/components/ui";
import { AdminGuard } from "../AdminGuard";

const ORDER: Section[] = ["subjects", "traps", "topics", "laws", "exam", "questions"];

export default function AdminImport() {
  return (
    <AdminGuard>
      <Importer />
    </AdminGuard>
  );
}

function Importer() {
  const { reload } = useContent();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [check, setCheck] = useState<ImportCheck | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeText = (value: string) => {
    setText(value);
    setCheck(null);
    setDone(false);
    setError(null);
  };

  const validate = () => {
    setError(null);
    setDone(false);
    try {
      setCheck(validateImport(parseImport(text)));
    } catch (e) {
      setCheck(null);
      setError((e as Error).message);
    }
  };

  const run = async () => {
    if (!check || check.errors.length) return;
    setRunning(true);
    setError(null);
    try {
      await applyImport(check.payload, setProgress);
      await reload();
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">Importar conteúdo</h1>
        <p className="text-[15px] text-ink-2 sm:text-[17px]">Envie um arquivo JSON com questões, tópicos ou outras partes do conteúdo. Nada é gravado antes da validação passar sem erros.</p>
      </header>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-button border border-line-strong px-4 text-[13px] font-semibold text-ink-strong hover:bg-sidebar">
            Escolher arquivo .json
            <input
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFileName(f.name);
                changeText(await f.text());
              }}
            />
          </label>
          {fileName && <span className="text-[13px] text-ink-2">{fileName}</span>}
          <Button variant="text" onClick={() => downloadFile("modelo-importacao.json", JSON.stringify(TEMPLATE, null, 2), "application/json")}>Baixar modelo</Button>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold">
          Ou cole o JSON aqui
          <textarea className={`${textareaClasses} font-mono text-xs`} rows={10} value={text} onChange={(e) => changeText(e.target.value)} spellCheck={false} />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={validate} disabled={!text.trim() || running}>Validar</Button>
          <Button onClick={run} disabled={!check || check.errors.length > 0 || running || done}>{running ? "Importando…" : "Importar"}</Button>
        </div>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}

      {check && (
        <Card className="flex flex-col gap-3 p-5">
          <Heading>{check.errors.length ? `${check.errors.length} problema(s) encontrados` : "Tudo certo para importar"}</Heading>
          {Object.keys(check.counts).length > 0 && (
            <ul className="flex flex-col gap-1 text-[13px]">
              {ORDER.filter((s) => check.counts[s]).map((s) => {
                const c = check.counts[s]!;
                return (
                  <li key={s}>
                    <strong className="capitalize">{SECTION_LABEL[s]}</strong>: {s === "exam" ? "atualiza os dados do edital" : s === "laws" ? `${c.created} lei(s), substituindo as das matérias citadas` : `${c.created} nova(s), ${c.updated} atualizada(s)`}
                  </li>
                );
              })}
            </ul>
          )}
          {check.errors.length > 0 && (
            <ul className="flex max-h-[50vh] list-disc flex-col gap-1 overflow-y-auto pl-5 text-[13px] text-danger">
              {check.errors.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
        </Card>
      )}

      {(running || done) && progress && (
        <Notice tone={done ? "success" : "brand"}>
          <span role="status">{done ? "Importação concluída. O conteúdo novo já está valendo para quem estuda." : progress}</span>
        </Notice>
      )}

      <Card className="flex flex-col gap-3 p-5 text-[13px] leading-relaxed text-ink-strong">
        <Heading>Formato aceito</Heading>
        <p>
          Uma lista de questões, ou um objeto com qualquer destas seções: <code>subjects</code> (matérias), <code>traps</code> (pegadinhas), <code>topics</code> (tópicos e guia), <code>laws</code> (lei seca), <code>exam</code> (edital) e <code>questions</code> (questões). Os campos têm os mesmos nomes das colunas do banco; o modelo mostra um exemplo de cada.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Item com <code>id</code> novo é criado; com <code>id</code> que já existe é atualizado. Campos que ficarem de fora mantêm o valor atual.</li>
          <li>Questão nova precisa de <code>year</code>, <code>subject</code>, <code>topic</code>, <code>statement</code>, <code>options</code> e <code>answer</code>.</li>
          <li><code>answer</code> é a letra correta (A a E) ou N para anulada. <code>options</code> e <code>distractors</code> são objetos por letra.</li>
          <li><code>topic</code> precisa ser da mesma matéria da questão, e cada item de <code>traps</code> precisa existir (ou vir no mesmo arquivo).</li>
          <li>Em <code>laws</code>, a lista de cada matéria citada substitui a lista atual daquela matéria.</li>
          <li>Imagens não vêm no JSON: depois de importar, envie pela tela da questão.</li>
          <li>O arquivo de “Exportar conteúdo”, no Painel, já está neste formato.</li>
        </ul>
      </Card>
    </div>
  );
}
