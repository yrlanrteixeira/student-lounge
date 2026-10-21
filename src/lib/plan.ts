import { INDEX, isTrainable, subjectById, trapById } from "./content";
import { addDays, daysBetween, seededRandom, toIsoDate, today, weekday } from "./dates";
import { dueReviews, priorities, rate, scores, weakestTraps } from "./stats";
import type { Answer, Profile, QuestionIndex, Review, TopicProgress } from "./types";

/** Weekly schedule from the study guide (0 = Sunday). */
export const SCHEDULE: Record<number, { subjects: string[]; label: string }> = {
  1: { subjects: ["portugues", "penal"], label: "Português + Direito Penal" },
  2: { subjects: ["processo_civil", "informatica"], label: "Processo Civil + Informática" },
  3: { subjects: ["processo_penal", "raciocinio_logico"], label: "Processo Penal + Raciocínio Lógico" },
  4: { subjects: ["administrativo", "matematica"], label: "Administrativo + Matemática" },
  5: { subjects: ["legislacao_interna", "constitucional", "atualidades_pcd"], label: "Leg. Interna + Constitucional + PcD" },
  6: { subjects: [], label: "Revisão da semana + Atualidades + Redação" },
  0: { subjects: [], label: "Simulado ou revisão geral" },
};

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export interface Phase {
  number: 1 | 2 | 3;
  name: string;
  description: string;
  questionsPerDay: number;
  week: number;
  totalWeeks: number;
  daysLeft: number;
}

export function phaseOn(profile: Profile, day = today()): Phase {
  const finalStart = addDays(profile.exam_date, -21);
  const baseEnd = addDays(profile.start_date, Math.round(daysBetween(profile.start_date, finalStart) * 0.6));
  const week = Math.max(1, Math.floor(daysBetween(profile.start_date, day) / 7) + 1);
  const totalWeeks = Math.max(1, Math.ceil(daysBetween(profile.start_date, profile.exam_date) / 7));
  const daysLeft = Math.max(0, daysBetween(day, profile.exam_date));
  if (day >= finalStart)
    return { number: 3, name: "Reta final", description: "Simulados, revisão de erros e lei seca. Nada de conteúdo novo.", questionsPerDay: 40, week, totalWeeks, daysLeft };
  if (day > baseEnd)
    return { number: 2, name: "Volume", description: "Mais questões por dia e foco nos tópicos fracos.", questionsPerDay: 30, week, totalWeeks, daysLeft };
  return { number: 1, name: "Base", description: "Lei seca, guia do tópico e 20 questões por dia.", questionsPerDay: 20, week, totalWeeks, daysLeft };
}

export function isMockExamDay(profile: Profile, day = today()) {
  if (weekday(day) !== 0) return false;
  const p = phaseOn(profile, day);
  return p.number === 3 || p.week % 2 === 0;
}

/* ---------------- Question picking ---------------- */

interface PickOptions {
  pool: QuestionIndex[];
  n: number;
  answers: Answer[];
  seed: string;
  focus?: string;
  phase?: number;
  exclude?: Set<string>;
}

export function pickQuestions({ pool, n, answers, seed, focus, phase = 1, exclude }: PickOptions): string[] {
  const rnd = seededRandom(seed);
  const last = new Map<string, Answer>();
  for (const a of answers) last.set(a.question_id, a);
  const { byTopic } = scores(answers);
  const day = today();

  const ranked = pool
    .filter((q) => isTrainable(q) && !exclude?.has(q.id))
    .map((q) => {
      const l = last.get(q.id);
      let score = 0;
      if (!l) score += 4;
      else if (!l.correct) score += 2.5;
      if (focus && q.topic === focus) score += 3;
      const hit = rate(byTopic.get(q.topic), 3);
      score += (1 - (hit ?? 0.45)) * 2;
      if (l && daysBetween(toIsoDate(new Date(l.created_at)), day) < 10) score -= 6;
      if (phase === 1 && q.difficulty === 3) score -= 0.5;
      if (q.status !== "ok") score -= 3;
      score += rnd() * 0.8;
      return { id: q.id, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked.slice(0, n).map((r) => r.id);
}

/** Splits n questions among the day's subjects (the remainder goes to the first one). */
function split(n: number, subjects: string[]) {
  const base = Math.floor(n / subjects.length);
  return subjects.map((s, i) => ({ subject: s, n: base + (i === 0 ? n - base * subjects.length : 0) }));
}

/* ---------------- Daily mission ---------------- */

export type Step =
  | { kind: "review"; ids: string[]; done: number }
  | { kind: "topic"; topic: string; subject: string; read: boolean }
  | { kind: "practice"; ids: string[]; done: number; correct: number; composition: { subject: string; n: number }[]; title: string }
  | { kind: "trap"; trap: string; ids: string[]; done: number }
  | { kind: "mock_exam" }
  | { kind: "essay" };

export interface Mission {
  day: string;
  weekday: number;
  label: string;
  subjects: string[];
  phase: Phase;
  steps: Step[];
  completed: number;
  minutes: number;
}

interface MissionInput {
  profile: Profile;
  answers: Answer[];
  reviews: Review[];
  topicProgress: TopicProgress[];
  day?: string;
}

export function focusTopic(subject: string, pastAnswers: Answer[], topicProgress: TopicProgress[]) {
  const { byTopic } = scores(pastAnswers);
  const mastered = new Set(topicProgress.filter((t) => t.mastered).map((t) => t.topic_id));
  const ranking = priorities(byTopic).filter((r) => r.subject === subject && !mastered.has(r.topic));
  return ranking[0]?.topic ?? null;
}

export function buildMission({ profile, answers, reviews, topicProgress, day = today() }: MissionInput): Mission {
  const wd = weekday(day);
  const phase = phaseOn(profile, day);
  const past = answers.filter((a) => toIsoDate(new Date(a.created_at)) < day);
  const ofToday = answers.filter((a) => toIsoDate(new Date(a.created_at)) === day);
  const answeredToday = (ctx: string) => new Set(ofToday.filter((a) => a.context === ctx).map((a) => a.question_id));
  const steps: Step[] = [];

  // 1. Spaced review (what is due today, plus what was already reviewed today)
  const reviewedToday = answeredToday("review");
  const due = dueReviews(reviews, day).filter((id) => !reviewedToday.has(id));
  const reviewIds = [...reviewedToday, ...due].slice(0, Math.max(25, reviewedToday.size));
  steps.push({ kind: "review", ids: reviewIds, done: reviewedToday.size });

  const schedule = SCHEDULE[wd];
  let subjects = schedule.subjects;
  let practiceTitle = `${phase.questionsPerDay} questões Vunesp`;
  const daySeed = `${day}:${profile.start_date}`;
  const doneOf = (ids: string[]) => {
    const done = ofToday.filter((a) => a.context === "mission" && ids.includes(a.question_id));
    return { done: new Set(done.map((a) => a.question_id)).size, correct: done.filter((a) => a.correct).length };
  };

  if (wd >= 1 && wd <= 5) {
    // 2. Focus topic in the main subject of the day
    const focus = focusTopic(subjects[0], past, topicProgress);
    if (focus) {
      const st = topicProgress.find((t) => t.topic_id === focus);
      steps.push({ kind: "topic", topic: focus, subject: subjects[0], read: Boolean(st?.guide_read && toIsoDate(new Date(st.updated_at)) === day) });
    }
    // 3. Practice block with the day's subjects
    const composition = split(phase.questionsPerDay, subjects);
    const ids: string[] = [];
    for (const c of composition) {
      ids.push(
        ...pickQuestions({
          pool: INDEX.filter((q) => q.subject === c.subject),
          n: c.n,
          answers: past,
          seed: `${daySeed}:${c.subject}`,
          focus: c.subject === subjects[0] ? focus ?? undefined : undefined,
          phase: phase.number,
          exclude: new Set(reviewIds),
        })
      );
    }
    steps.push({ kind: "practice", ids, ...doneOf(ids), composition, title: practiceTitle });
  } else if (wd === 6) {
    // Saturday: the week's mistakes + PcD statute + essay
    const weekStart = addDays(day, -6);
    const weekErrors = [...new Set(past.filter((a) => !a.correct && toIsoDate(new Date(a.created_at)) >= weekStart).map((a) => a.question_id))].filter((id) => !reviewIds.includes(id));
    const pcd = pickQuestions({ pool: INDEX.filter((q) => q.topic === "atu.pcd"), n: 5, answers: past, seed: `${daySeed}:pcd` });
    const ids = [...weekErrors.slice(0, phase.questionsPerDay - 5), ...pcd];
    subjects = ["atualidades_pcd"];
    practiceTitle = "Erros da semana + Estatuto PcD";
    steps.push({ kind: "practice", ids, ...doneOf(ids), composition: [], title: practiceTitle });
    steps.push({ kind: "essay" });
  } else {
    // Sunday: mock exam every other week (every week in the final stretch) / general review
    if (isMockExamDay(profile, day)) {
      steps.push({ kind: "mock_exam" });
    } else {
      const { byTopic } = scores(past);
      const top = priorities(byTopic).slice(0, 6).map((r) => r.topic);
      const ids = pickQuestions({ pool: INDEX.filter((q) => top.includes(q.topic)), n: phase.questionsPerDay, answers: past, seed: `${daySeed}:general`, exclude: new Set(reviewIds) });
      practiceTitle = "Revisão geral dos tópicos prioritários";
      steps.push({ kind: "practice", ids, ...doneOf(ids), composition: [], title: practiceTitle });
    }
  }

  // 4. Trap of the day: the one the student falls for the most (or one per day, in rotation)
  if (wd !== 0) {
    const { byTrap } = scores(past);
    const worst = weakestTraps(byTrap);
    const rotation = ["literalidade_trocada", "prazo_numero", "instituto_vizinho", "generalizacao", "norma_padrao_sutil", "regra_excecao"];
    const trap = worst[0]?.id ?? rotation[(phase.week + wd) % rotation.length];
    const used = new Set(steps.flatMap((s) => ("ids" in s ? s.ids : [])));
    const pool = INDEX.filter((q) => q.traps.includes(trap));
    const ids = pickQuestions({ pool, n: 3, answers: past, seed: `${daySeed}:trap`, exclude: used });
    const done = new Set(ofToday.filter((a) => a.context === "trap" && ids.includes(a.question_id)).map((a) => a.question_id)).size;
    if (trapById[trap] && ids.length) steps.push({ kind: "trap", trap, ids, done });
  }

  const minutes = steps.reduce((sum, s) => {
    if (s.kind === "review") return sum + s.ids.length * 2;
    if (s.kind === "topic") return sum + 15;
    if (s.kind === "practice") return sum + s.ids.length * 3;
    if (s.kind === "trap") return sum + 6;
    if (s.kind === "essay") return sum + 60;
    if (s.kind === "mock_exam") return sum + 270;
    return sum;
  }, 0);

  return {
    day,
    weekday: wd,
    label: schedule.label,
    subjects,
    phase,
    steps,
    completed: steps.filter(isStepDone).length,
    minutes,
  };
}

export function isStepDone(s: Step) {
  switch (s.kind) {
    case "review":
      return s.ids.length === 0 || s.done >= s.ids.length;
    case "topic":
      return s.read;
    case "practice":
      return s.ids.length > 0 && s.done >= s.ids.length;
    case "trap":
      return s.done >= s.ids.length;
    default:
      return false;
  }
}

export function subjectColor(id: string) {
  return subjectById[id]?.color ?? "#C11574";
}
