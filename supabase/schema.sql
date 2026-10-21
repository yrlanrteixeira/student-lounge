-- Rumo ao TJSP — esquema do Supabase
-- Cole tudo no SQL Editor do Supabase e clique em "Run". Pode rodar de novo sem problema.
-- As questões e o guia ficam no próprio código (src/data). O banco guarda só o progresso de cada pessoa.

create table if not exists public.perfis (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  nome text not null default '',
  data_prova date not null default '2027-03-14',
  inicio date not null default '2026-10-19',
  notebooklm jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.respostas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  questao_id text not null,
  materia_id text not null,
  topico_id text not null,
  pegadinhas text[] not null default '{}',
  alternativa text not null,
  correta boolean not null,
  confianca text check (confianca in ('certeza', 'duvida')),
  causa_erro text check (causa_erro in ('nao_sabia', 'confundi', 'atencao')),
  tempo_seg integer not null default 0,
  contexto text not null default 'livre',
  created_at timestamptz not null default now()
);
create index if not exists respostas_user_idx on public.respostas (user_id, created_at desc);

create table if not exists public.revisoes (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  questao_id text not null,
  etapa integer not null default 0,
  proxima date,
  updated_at timestamptz not null default now(),
  primary key (user_id, questao_id)
);

create table if not exists public.topico_status (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  topico_id text not null,
  guia_lido boolean not null default false,
  dominado_manual boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, topico_id)
);

create table if not exists public.simulados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null,
  total integer not null,
  acertos integer not null,
  por_bloco jsonb not null default '{}'::jsonb,
  duracao_seg integer not null default 0,
  created_at timestamptz not null default now()
);

-- Cada pessoa só vê e altera os próprios dados.
alter table public.perfis enable row level security;
alter table public.respostas enable row level security;
alter table public.revisoes enable row level security;
alter table public.topico_status enable row level security;
alter table public.simulados enable row level security;

do $$
declare t text;
begin
  foreach t in array array['perfis', 'respostas', 'revisoes', 'topico_status', 'simulados'] loop
    execute format('drop policy if exists "dono" on public.%I', t);
    execute format(
      'create policy "dono" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
