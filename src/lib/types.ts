export type Letter = "A" | "B" | "C" | "D" | "E";

export type QuestionStatus = "ok" | "outdated" | "annulled" | "off_syllabus" | "disputed_key";

export interface Question {
  id: string;
  year: string;
  number: number;
  source: string;
  subject: string;
  topic: string;
  subtopic: string;
  legal_refs: string;
  passage: string | null;
  statement: string;
  options: Record<string, string>;
  /** "N" = annulled question (every choice counts as correct). */
  answer: Letter | "N";
  difficulty: number;
  traps: string[];
  trap_note: string;
  explanation: string;
  distractors: Record<string, string>;
  tip: string;
  status: QuestionStatus;
  status_note: string;
  needs_image: boolean;
  /** Path inside the "questions" Storage bucket, or a full URL. */
  image: string | null;
  page: number | null;
  page_side: string | null;
}

/** Lightweight version kept in the browser to build blocks and stats. */
export interface QuestionIndex {
  id: string;
  year: string;
  subject: string;
  topic: string;
  traps: string[];
  difficulty: number;
  status: QuestionStatus;
}

export interface Subject {
  id: string;
  name: string;
  block: "I" | "II" | "III";
  exam_questions: number;
  color: string;
  overview: string;
  position: number;
}

export type Priority = "high" | "medium" | "low";

/** Syllabus topic with its study guide. */
export interface Topic {
  id: string;
  subject: string;
  name: string;
  short_name: string;
  syllabus_ref: string;
  occurrences: number;
  years: string[];
  priority: Priority;
  how_tested: string;
  memorize: string[];
  common_traps: string[];
  comparison: string;
  position: number;
}

export interface Trap {
  id: string;
  name: string;
  description: string;
  position: number;
}

export interface Law {
  subject: string;
  name: string;
  url: string;
  excerpt: string;
  position: number;
}

export interface Exam {
  name: string;
  board: string;
  registration: string;
  exam_date: string;
  blocks: { id: string; name: string; questions: number; minimum: number; eliminatory: boolean }[];
  essay: { points?: number; minimum?: number };
}

export type ReportReason = "answer_key" | "statement" | "explanation" | "outdated" | "image" | "other";
export type ReportStatus = "open" | "resolved" | "dismissed";

export interface Report {
  id: string;
  user_id: string;
  question_id: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  admin_note: string;
  created_at: string;
  resolved_at: string | null;
}

export type Confidence = "sure" | "unsure";
export type ErrorCause = "didnt_know" | "confused" | "careless";
export type AnswerContext = "mission" | "review" | "topic" | "trap" | "free" | "mock_exam";

export interface Answer {
  id: string;
  question_id: string;
  subject_id: string;
  topic_id: string;
  traps: string[];
  choice: string;
  correct: boolean;
  confidence: Confidence | null;
  error_cause: ErrorCause | null;
  time_sec: number;
  context: AnswerContext;
  created_at: string;
}

export interface Review {
  question_id: string;
  stage: number;
  /** yyyy-mm-dd; null = finished. */
  due_date: string | null;
  updated_at: string;
}

export interface TopicProgress {
  topic_id: string;
  guide_read: boolean;
  mastered: boolean;
  updated_at: string;
}

export interface Profile {
  name: string;
  exam_date: string;
  start_date: string;
  notebooklm: Record<string, string>;
}

export interface Score {
  correct: number;
  total: number;
}

export interface MockExamResult {
  id: string;
  title: string;
  total: number;
  correct_count: number;
  by_block: Record<string, Score>;
  duration_sec: number;
  created_at: string;
}
