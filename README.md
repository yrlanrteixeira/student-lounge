# Rumo ao TJSP

Plataforma de estudos para o concurso de **Escrevente Técnico Judiciário do TJ-SP** (Vunesp, edital 02/2026, prova em 14/03/2027).

- **670 questões reais** da Vunesp (TJSP 2017, 2018, 2021, 2023, 2024, 2024 reaplicação e 2025), com gabarito conferido, comentário, pegadinha, "por que as outras estão erradas" e macete.
- **Edital mastigado**: 76 tópicos, cada um com como a banca cobra, o que decorar, pegadinhas recorrentes e quadro "não confunda".
- **Missão do dia** seguindo o cronograma semanal, em 3 fases (Base → Volume → Reta final).
- **Revisão espaçada** dos erros (1, 3, 7, 15 e 30 dias) e caderno de erros.
- **Diagnóstico**: nota projetada, blocos × corte, prioridades, mapa por tópico, pegadinhas em que mais cai e causas dos erros.
- **Simulados** no formato 2027 (70 questões) e provas originais.
- **NotebookLM**: cada matéria gera um `.md` para subir como fonte (áudio, quiz e flashcards).
- **Administração** (`/admin`): importar, editar e tratar o conteúdo pelo próprio app, com fila de problemas reportados por quem estuda.

Stack: Next.js 15 + Tailwind 4 + Supabase (Auth, Postgres e Storage) + Vercel. Tudo no plano gratuito.

Tudo fica no Supabase: o conteúdo (questões, edital, guia, imagens) e o progresso de cada pessoa. Não existe modo local nem arquivo de conteúdo no repositório.

---

## Rodar no computador

1. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Sem elas o app não abre.
2. Rode:

```bash
npm install
npm run dev
```

Abra http://localhost:3000.

## Colocar no ar

### 1. Supabase (banco, login e imagens)
1. Crie um projeto grátis em https://supabase.com.
2. **SQL Editor**: cole o conteúdo de `supabase/schema.sql` e clique em **Run**. O script pode rodar de novo sem problema.
3. **Authentication → Users → Add user**: crie os usuários com e-mail e senha, marcando "Auto Confirm User".
4. **Authentication → Sign In / Providers → Email**: desligue *Allow new users to sign up*.
5. **Dar acesso de admin** a quem vai alimentar o conteúdo, no SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com';
   ```
6. **Project Settings → API**: copie a *Project URL* e a chave *anon public*.
7. Carregue o conteúdo em `/admin/import` (veja abaixo).

### 2. Vercel (site)
1. Suba esta pasta para um repositório no GitHub.
2. Em https://vercel.com, use **Add New → Project** e importe o repositório.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Deploy**. Cada `git push` publica de novo sozinho.

### 3. No celular
Abra o site no Safari (iPhone) ou Chrome (Android) e use **Adicionar à Tela de Início**. Ele abre como app.

---

## Segurança

- Visitante sem login não acessa nenhuma tabela.
- Conteúdo (`exam`, `subjects`, `topics`, `traps`, `laws`, `questions`): quem está logado lê; só quem está em `admins` grava.
- Progresso (`profiles`, `answers`, `reviews`, `topic_progress`, `mock_exams`): cada pessoa só vê e altera as próprias linhas.
- Reportes (`reports`): cada pessoa abre e vê os seus; o admin vê todos e resolve.
- Imagens: bucket público `questions` (são páginas das provas oficiais); só admin envia, troca ou apaga.
- O próprio banco valida o conteúdo: tópico precisa ser da matéria da questão, toda pegadinha citada precisa existir, gabarito só aceita A a E ou N.

## Administração do conteúdo

| Quero… | Onde |
|---|---|
| Subir muitas questões de uma vez | `/admin/import` |
| Criar ou corrigir uma questão, trocar a imagem | `/admin/questions` |
| Ver problemas apontados por quem estuda | `/admin/reports` |
| Editar o guia de um tópico ou criar tópico | `/admin/topics` |
| Backup completo | `/admin`, botão "Exportar conteúdo (JSON)" |
| Matérias, tipos de pegadinha, lei seca, dados do edital | Exportar, editar o JSON e importar de volta |

Para tirar uma questão de circulação, prefira mudar a situação para `annulled`, `outdated` ou `off_syllabus` em vez de apagar. Apagar não some com o histórico de quem já respondeu.

### Formato de importação

O arquivo é o mesmo que "Exportar conteúdo" gera. Pode ser uma lista simples (tratada como questões) ou um objeto com qualquer combinação destas seções, com os campos iguais às colunas do banco:

```json
{
  "subjects": [{ "id": "penal", "name": "Direito Penal", "block": "II", "exam_questions": 4, "color": "#…", "overview": "…", "position": 1 }],
  "traps": [{ "id": "regra_excecao", "name": "Regra × exceção", "description": "…", "position": 4 }],
  "topics": [{ "id": "pen.peculato", "subject": "penal", "name": "Peculato", "short_name": "Peculato", "syllabus_ref": "art. 312", "occurrences": 9, "years": ["2023", "2025"], "priority": "high", "how_tested": "…", "memorize": ["…"], "common_traps": ["…"], "comparison": "…", "position": 12 }],
  "laws": [{ "subject": "penal", "name": "Código Penal", "url": "https://…", "excerpt": "arts. 312–317", "position": 0 }],
  "exam": { "name": "…", "board": "Vunesp", "registration": "2026-10-28 a 2026-12-10", "exam_date": "2027-03-14", "blocks": [], "essay": {} },
  "questions": [
    {
      "id": "2026-001",
      "year": "2026",
      "number": 1,
      "source": "Simulado próprio",
      "subject": "penal",
      "topic": "pen.peculato",
      "subtopic": "Peculato culposo",
      "legal_refs": "CP, art. 312, § 3º",
      "passage": null,
      "statement": "…",
      "options": { "A": "…", "B": "…", "C": "…", "D": "…", "E": "…" },
      "answer": "C",
      "difficulty": 2,
      "traps": ["regra_excecao"],
      "trap_note": "Uma frase sobre a armadilha.",
      "explanation": "Por que a correta está correta.",
      "distractors": { "A": "…", "B": "…", "D": "…", "E": "…" },
      "tip": "",
      "status": "ok",
      "status_note": "",
      "needs_image": false,
      "image": null
    }
  ]
}
```

Regras:
- `id` novo cria; `id` existente atualiza. Campos omitidos mantêm o valor atual.
- Questão nova precisa de `year`, `subject`, `topic`, `statement`, `options` e `answer`.
- `answer`: `A` a `E`, ou `N` para anulada. `difficulty`: 1 a 3. `priority`: `high`, `medium` ou `low`.
- `status`: `ok`, `outdated`, `annulled`, `off_syllabus` ou `disputed_key`. Anuladas e atualidades vencidas não entram nos treinos.
- Em `laws`, a lista de cada matéria citada substitui a lista atual daquela matéria.
- A validação mostra os erros item a item antes de gravar; o botão de importar só libera sem erros.
- Imagem: envie pelo editor da questão. Ela vai para o bucket `questions` como `<id>.png` e o campo `image` guarda esse caminho.

## Estrutura

```
src/
  app/                 páginas (Hoje, Questões, Revisão, Simulados, Diagnóstico, Edital, Configurações, Admin)
  components/          AppShell, QuestionRunner (resolver questões), MockExam (simulado), ui, icons
  lib/
    content.ts         conteúdo carregado do Supabase (questões, tópicos, matérias…)
    plan.ts            missão do dia, fases e cronograma semanal
    stats.ts           estatísticas e prioridades
    admin.ts           validação, importação e exportação do conteúdo
    data/              ContentProvider, UserDataProvider e acesso ao progresso
supabase/schema.sql    tabelas, validações e segurança
design/                logo original (EPS e JPG) e o SVG vetorizado usado no app e nos ícones
```

Código, pastas, URLs e banco estão em inglês; os textos da tela e os ids de conteúdo (`portugues`, `pt.interpretacao`) ficam em português.

| Tela | URL |
|---|---|
| Hoje | `/` |
| Questões | `/questions` |
| Resolver questões | `/practice?mode=mission\|review\|trap\|mistakes\|free` |
| Revisão de erros | `/review` |
| Simulados | `/mock-exams`, `/mock-exams/format-2027`, `/mock-exams/<ano>` |
| Diagnóstico | `/diagnosis` |
| Edital mastigado | `/syllabus`, `/syllabus/<tópico>` |
| Configurações | `/settings` |
| Administração | `/admin`, `/admin/questions`, `/admin/import`, `/admin/reports`, `/admin/topics` |

## Pontos para conferir

- **TJSP 2023, Q49**: o gabarito oficial (C) parece não bater com a letra da CF (art. 39, § 2º). Vale olhar o caderno original.
- **TJSP 2025, Q57** (Word, sublinhado em seleção mista): explicação segue o gabarito, mas não foi testada no Word.
- **Normas da Corregedoria**: as questões antigas citam SAJ e autos físicos. Confira a redação atual do Tomo I (mudanças com o eproc).
- Questões anteriores à Lei 14.230/2021 (improbidade) estão marcadas como **desatualizadas**.
