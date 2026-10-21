# Rumo ao TJSP

Plataforma de estudos para o concurso de **Escrevente Técnico Judiciário do TJ-SP** (Vunesp, edital 02/2026, prova em 14/03/2027).

- **670 questões reais** da Vunesp (TJSP 2017, 2018, 2021, 2023, 2024, 2024 reaplicação e 2025), com gabarito conferido, comentário, pegadinha, "por que as outras estão erradas" e macete.
- **Edital mastigado**: 76 tópicos, cada um com como a banca cobra, o que decorar, pegadinhas recorrentes e quadro "não confunda".
- **Missão do dia** seguindo o cronograma semanal, em 3 fases (Base → Volume → Reta final).
- **Revisão espaçada** dos erros (1, 3, 7, 15 e 30 dias) e caderno de erros.
- **Diagnóstico**: nota projetada, blocos × corte, prioridades, mapa por tópico, pegadinhas em que mais cai e causas dos erros.
- **Simulados** no formato 2027 (70 questões) e provas originais.
- **NotebookLM**: cada matéria gera um `.md` para subir como fonte (áudio, quiz e flashcards).

Stack: Next.js 15 + Tailwind 4 + Supabase (Auth + Postgres) + Vercel. Tudo no plano gratuito.

---

## Rodar no computador

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem o Supabase configurado, o app roda no **modo local** (o progresso fica só naquele navegador).

## Colocar no ar (≈ 15 minutos)

### 1. Supabase (banco e login)
1. Crie um projeto grátis em https://supabase.com.
2. **SQL Editor** → cole o conteúdo de `supabase/schema.sql` → **Run**.
3. **Authentication → Users → Add user**: crie o usuário dela (e o seu) com e-mail e senha. Marque "Auto Confirm User".
4. **Authentication → Sign In / Providers → Email**: desligue *Allow new users to sign up* (só vocês entram).
5. **Project Settings → API**: copie a *Project URL* e a chave *anon public*.

### 2. Vercel (site)
1. Suba esta pasta para um repositório no GitHub.
2. Em https://vercel.com → **Add New → Project** → importe o repositório.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. Cada `git push` publica de novo sozinho.

### 3. No celular
Abra o site no Safari (iPhone) ou Chrome (Android) → **Adicionar à Tela de Início**. Ele abre como app.

---

## Manutenção

| Quero… | Onde mexer |
|---|---|
| Adicionar ou corrigir questões | `src/data/banco.json` |
| Ajustar o edital mastigado | `src/data/guia.json` |
| Mudar tópicos, pesos e tipos de pegadinha | `src/data/taxonomia.json` |
| Mudar o cronograma semanal ou as fases | `src/lib/plano.ts` |
| Links de lei seca | `src/lib/leis.ts` |
| Cores e fontes | `src/app/globals.css` |

### Formato de uma questão (`banco.json`)

```json
{
  "id": "2026-001",
  "ano": "2026",
  "numero": 1,
  "fonte": "Simulado próprio",
  "materia": "penal",
  "topico": "pen.peculato",
  "subtopico": "Peculato culposo",
  "artigos": "CP, art. 312, § 3º",
  "texto_base": null,
  "enunciado": "…",
  "alternativas": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" },
  "gabarito": "C",
  "dificuldade": 2,
  "pegadinhas": ["regra_excecao"],
  "pegadinha": "Uma frase sobre a armadilha.",
  "explicacao": "Por que a correta está correta.",
  "distratores": { "A": "…", "B": "…", "D": "…", "E": "…" },
  "dica": "",
  "status": "ok",
  "status_nota": "",
  "precisa_imagem": false
}
```

- `materia`, `topico` e `pegadinhas` precisam existir em `taxonomia.json`.
- `id` não pode repetir (o build avisa).
- Questão com figura: salve a imagem em `public/questoes/<id>.png` e adicione `"imagem": "/questoes/<id>.png"`.
- `status`: `ok`, `desatualizada`, `anulada` ou `fora_edital` (anuladas e atualidades vencidas não entram nos blocos).

Depois de editar: `npm run build` para conferir e `git push` para publicar.

## Estrutura

```
src/
  app/            páginas (Hoje, Questões, Revisão, Simulados, Diagnóstico, Edital, Configurações)
  components/     AppShell (menu responsivo), Runner (resolver questões), Simulado, ui
  lib/            plano (missão do dia), estatísticas, dados (Supabase ou local), conteúdo
  data/           banco de questões, guia, taxonomia (o indice.json é gerado no build)
supabase/schema.sql   tabelas + segurança (cada pessoa só vê os próprios dados)
```

## Pontos para conferir

- **TJSP 2023, Q49**: o gabarito oficial (C) parece não bater com a letra da CF (art. 39, § 2º). Vale olhar o caderno original.
- **TJSP 2025, Q57** (Word, sublinhado em seleção mista): explicação segue o gabarito, mas não foi testada no Word.
- **Normas da Corregedoria**: as questões antigas citam SAJ e autos físicos. Confira a redação atual do Tomo I (mudanças com o eproc).
- Questões anteriores à Lei 14.230/2021 (improbidade) estão marcadas como **desatualizadas**.
