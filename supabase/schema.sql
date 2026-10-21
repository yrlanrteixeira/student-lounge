-- Rumo ao TJSP: Supabase schema.
-- Paste it into the Supabase SQL Editor and click "Run". Safe to run again.
-- Content (questions, syllabus, guide) is shared and only admins change it; progress belongs to each user.

/* ---------------- Admins ---------------- */

create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

-- Security invoker: it relies on the "self" policy below, so a user can only learn about themselves.
create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

/* ---------------- Content ---------------- */

create table if not exists public.exam (
  id smallint primary key default 1 check (id = 1),
  name text not null,
  board text not null default 'Vunesp',
  registration text not null default '',
  exam_date date not null,
  blocks jsonb not null default '[]'::jsonb,
  essay jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  block text not null check (block in ('I', 'II', 'III')),
  exam_questions integer not null default 0 check (exam_questions >= 0),
  color text not null default '#C11574',
  overview text not null default '',
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.topics (
  id text primary key check (id ~ '^[a-z0-9_]+\.[a-z0-9_]+$'),
  subject text not null references public.subjects on update cascade,
  name text not null,
  short_name text not null default '',
  syllabus_ref text not null default '',
  occurrences integer not null default 0 check (occurrences >= 0),
  years text[] not null default '{}',
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  how_tested text not null default '',
  memorize text[] not null default '{}',
  common_traps text[] not null default '{}',
  comparison text not null default '',
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (id, subject)
);
create index if not exists topics_subject_idx on public.topics (subject, position);

create table if not exists public.traps (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  name text not null,
  description text not null default '',
  position integer not null default 0
);

create table if not exists public.laws (
  id bigint generated always as identity primary key,
  subject text not null references public.subjects on update cascade on delete cascade,
  name text not null,
  url text not null check (url ~ '^https?://'),
  excerpt text not null default '',
  position integer not null default 0
);
create index if not exists laws_subject_idx on public.laws (subject, position);

create table if not exists public.questions (
  id text primary key check (id ~ '^[A-Za-z0-9_-]+$'),
  year text not null,
  number integer not null default 0,
  source text not null default '',
  subject text not null references public.subjects on update cascade,
  topic text not null,
  subtopic text not null default '',
  legal_refs text not null default '',
  passage text,
  statement text not null check (length(trim(statement)) > 0),
  options jsonb not null check (jsonb_typeof(options) = 'object'),
  answer text not null check (answer in ('A', 'B', 'C', 'D', 'E', 'N')),
  difficulty smallint not null default 2 check (difficulty between 1 and 3),
  traps text[] not null default '{}',
  trap_note text not null default '',
  explanation text not null default '',
  distractors jsonb not null default '{}'::jsonb check (jsonb_typeof(distractors) = 'object'),
  tip text not null default '',
  status text not null default 'ok' check (status in ('ok', 'outdated', 'annulled', 'off_syllabus', 'disputed_key')),
  status_note text not null default '',
  needs_image boolean not null default false,
  image text,
  page integer,
  page_side text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- the topic must belong to the question's subject
  foreign key (topic, subject) references public.topics (id, subject) on update cascade
);
create index if not exists questions_subject_idx on public.questions (subject);
create index if not exists questions_topic_idx on public.questions (topic, subject);
create index if not exists questions_year_idx on public.questions (year, number);

-- Arrays can't have foreign keys: this trigger ensures every referenced trap exists.
create or replace function public.check_question_traps()
returns trigger
language plpgsql
set search_path = ''
as $$
declare missing text;
begin
  select string_agg(t, ', ') into missing
  from unnest(new.traps) as t
  where not exists (select 1 from public.traps x where x.id = t);
  if missing is not null then
    raise exception 'Pegadinha inexistente na questão %: %', new.id, missing using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists questions_traps on public.questions;
create trigger questions_traps before insert or update of traps on public.questions
  for each row execute function public.check_question_traps();

do $$
declare t text;
begin
  foreach t in array array['exam', 'subjects', 'topics', 'questions'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

/* ---------------- Per-user progress ---------------- */

create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  name text not null default '',
  exam_date date not null default '2027-03-14',
  start_date date not null default '2026-10-19',
  notebooklm jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- No foreign key on question_id: deleting a question must not erase the history of who answered it.
create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  question_id text not null,
  subject_id text not null,
  topic_id text not null,
  traps text[] not null default '{}',
  choice text not null,
  correct boolean not null,
  confidence text check (confidence in ('sure', 'unsure')),
  error_cause text check (error_cause in ('didnt_know', 'confused', 'careless')),
  time_sec integer not null default 0,
  context text not null default 'free' check (context in ('mission', 'review', 'topic', 'trap', 'free', 'mock_exam')),
  created_at timestamptz not null default now()
);
create index if not exists answers_user_idx on public.answers (user_id, created_at desc);

create table if not exists public.reviews (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  question_id text not null,
  stage integer not null default 0,
  due_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create table if not exists public.topic_progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  topic_id text not null,
  guide_read boolean not null default false,
  mastered boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  total integer not null,
  correct_count integer not null,
  by_block jsonb not null default '{}'::jsonb,
  duration_sec integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists mock_exams_user_idx on public.mock_exams (user_id, created_at);

-- Problems reported by students (wrong answer key, truncated statement…), handled by an admin.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  question_id text not null references public.questions on update cascade on delete cascade,
  reason text not null check (reason in ('answer_key', 'statement', 'explanation', 'outdated', 'image', 'other')),
  details text not null default '' check (length(details) <= 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_question_idx on public.reports (question_id);
create index if not exists reports_user_idx on public.reports (user_id);

/* ---------------- Security ---------------- */

-- Anonymous visitors (anon) can't touch any table.
-- revoke all also removes the default TRUNCATE, which bypasses RLS.
do $$
declare t text;
begin
  foreach t in array array['admins', 'exam', 'subjects', 'topics', 'traps', 'laws', 'questions', 'profiles', 'answers', 'reviews', 'topic_progress', 'mock_exams', 'reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated, public', t);
  end loop;
end $$;

-- Each user can only see their own admins row (enough for is_admin()); nobody writes through the API.
grant select on table public.admins to authenticated;
drop policy if exists "self" on public.admins;
create policy "self" on public.admins for select to authenticated using (user_id = (select auth.uid()));

-- Content: any signed-in user reads; only admins write.
-- One policy per write action, so SELECT is covered by a single permissive policy.
do $$
declare t text;
begin
  foreach t in array array['exam', 'subjects', 'topics', 'traps', 'laws', 'questions'] loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('drop policy if exists "read" on public.%I', t);
    execute format('drop policy if exists "admin" on public.%I', t);
    execute format('drop policy if exists "admin insert" on public.%I', t);
    execute format('drop policy if exists "admin update" on public.%I', t);
    execute format('drop policy if exists "admin delete" on public.%I', t);
    execute format('create policy "read" on public.%I for select to authenticated using (true)', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check ((select public.is_admin()))', t);
    execute format(
      'create policy "admin update" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',
      t
    );
    execute format('create policy "admin delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t);
  end loop;
end $$;

-- Progress: each user only sees and changes their own rows.
-- (select auth.uid()) is evaluated once per query, not once per row.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'answers', 'reviews', 'topic_progress', 'mock_exams'] loop
    execute format('grant select, insert, update, delete on table public.%I to authenticated', t);
    execute format('drop policy if exists "owner" on public.%I', t);
    execute format(
      'create policy "owner" on public.%I for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end $$;

-- Reports: users open and see their own; admins see all and resolve them.
grant select, insert, update, delete on table public.reports to authenticated;
drop policy if exists "open" on public.reports;
drop policy if exists "see" on public.reports;
drop policy if exists "handle" on public.reports;
drop policy if exists "remove" on public.reports;
create policy "open" on public.reports for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open' and admin_note = '' and resolved_at is null);
create policy "see" on public.reports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "handle" on public.reports for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "remove" on public.reports for delete to authenticated
  using ((select public.is_admin()));

/* ---------------- Question images (Storage) ---------------- */

-- Public bucket for reading (they are pages of the official exams); only admins upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('questions', 'questions', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "questions admin" on storage.objects;
create policy "questions admin" on storage.objects for all to authenticated
  using (bucket_id = 'questions' and (select public.is_admin()))
  with check (bucket_id = 'questions' and (select public.is_admin()));
