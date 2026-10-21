// Gera src/data/indice.json (versão enxuta do banco) a partir de src/data/banco.json.
// Roda sozinho antes de `npm run dev` e `npm run build`.
import { readFileSync, writeFileSync } from "node:fs";

const banco = JSON.parse(readFileSync(new URL("../src/data/banco.json", import.meta.url)));
const ids = new Set();
const indice = banco.map((q) => {
  if (ids.has(q.id)) throw new Error(`ID repetido no banco: ${q.id}`);
  ids.add(q.id);
  for (const campo of ["id", "materia", "topico", "enunciado", "alternativas", "gabarito"]) {
    if (q[campo] === undefined || q[campo] === null) throw new Error(`Questão ${q.id} sem o campo "${campo}"`);
  }
  return { id: q.id, ano: q.ano, materia: q.materia, topico: q.topico, pegadinhas: q.pegadinhas ?? [], dificuldade: q.dificuldade ?? 2, status: q.status ?? "ok" };
});
writeFileSync(new URL("../src/data/indice.json", import.meta.url), JSON.stringify(indice));
console.log(`indice.json: ${indice.length} questões`);

// Resumo do guia (incidência e prioridade de cada tópico) para o navegador.
const guia = JSON.parse(readFileSync(new URL("../src/data/guia.json", import.meta.url)));
const resumo = {};
for (const m of guia) for (const t of m.topicos) resumo[t.topico] = { incidencia: t.incidencia, anos: t.anos, prioridade: t.prioridade };
writeFileSync(new URL("../src/data/guia-resumo.json", import.meta.url), JSON.stringify(resumo));
