"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Answer, AnswerContext, Confidence, ErrorCause, MockExamResult, Profile, QuestionIndex, Review, TopicProgress } from "../types";
import { DEFAULT_PROFILE, repo, type UserData } from "./repo";
import { addDays, today } from "../dates";

/** Spaced repetition intervals, in days, per stage. */
export const INTERVALS = [1, 3, 7, 15, 30];

interface Ctx extends UserData {
  loading: boolean;
  error: string | null;
  email: string | null;
  reviewByQuestion: Map<string, Review>;
  recordAnswer(args: {
    question: QuestionIndex;
    choice: string;
    answerKey: string;
    confidence: Confidence | null;
    timeSec: number;
    context: AnswerContext;
  }): Answer;
  setErrorCause(answerId: string, cause: ErrorCause): void;
  markTopic(topicId: string, fields: Partial<Pick<TopicProgress, "guide_read" | "mastered">>): void;
  saveProfile(p: Profile): Promise<void>;
  saveMockExam(m: Omit<MockExamResult, "id" | "created_at">): void;
  signOut(): Promise<void>;
}

const UserDataContext = createContext<Ctx | null>(null);

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<UserData>({ profile: DEFAULT_PROFILE, answers: [], reviews: [], topicProgress: [], mockExams: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    let alive = true;
    Promise.all([repo.load(), repo.email()])
      .then(([d, e]) => {
        if (!alive) return;
        setData(d);
        setEmail(e);
      })
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const fail = useCallback((e: unknown) => {
    setError(`Não foi possível salvar: ${(e as Error)?.message ?? e}. Verifique a internet.`);
  }, []);

  const reviewByQuestion = useMemo(() => new Map(data.reviews.map((r) => [r.question_id, r])), [data.reviews]);

  const recordAnswer: Ctx["recordAnswer"] = useCallback(
    ({ question, choice, answerKey, confidence, timeSec, context }) => {
      const correct = choice === answerKey;
      const now = new Date().toISOString();
      const answer: Answer = {
        id: newId(),
        question_id: question.id,
        subject_id: question.subject,
        topic_id: question.topic,
        traps: question.traps,
        choice,
        correct,
        confidence,
        error_cause: null,
        time_sec: Math.round(timeSec),
        context,
        created_at: now,
      };

      // Spaced repetition: a miss comes back tomorrow; a hit advances; an "unsure" hit enters the queue.
      const current = dataRef.current.reviews.find((r) => r.question_id === question.id);
      let review: Review | null = null;
      if (!correct) {
        review = { question_id: question.id, stage: 0, due_date: addDays(today(), INTERVALS[0]), updated_at: now };
      } else if (current && current.due_date) {
        const stage = current.stage + 1;
        review = {
          question_id: question.id,
          stage,
          due_date: stage >= INTERVALS.length ? null : addDays(today(), INTERVALS[stage]),
          updated_at: now,
        };
      } else if (!current && confidence === "unsure") {
        review = { question_id: question.id, stage: 1, due_date: addDays(today(), INTERVALS[1]), updated_at: now };
      }

      setData((d) => ({
        ...d,
        answers: [...d.answers, answer],
        reviews: review ? d.reviews.filter((r) => r.question_id !== question.id).concat(review) : d.reviews,
      }));
      repo.insertAnswer(answer).catch(fail);
      if (review) repo.saveReview(review).catch(fail);
      return answer;
    },
    [fail]
  );

  const setErrorCause = useCallback(
    (answerId: string, cause: ErrorCause) => {
      setData((d) => ({ ...d, answers: d.answers.map((a) => (a.id === answerId ? { ...a, error_cause: cause } : a)) }));
      repo.setErrorCause(answerId, cause).catch(fail);
    },
    [fail]
  );

  const markTopic: Ctx["markTopic"] = useCallback(
    (topicId, fields) => {
      const current = dataRef.current.topicProgress.find((t) => t.topic_id === topicId);
      const next: TopicProgress = {
        topic_id: topicId,
        guide_read: current?.guide_read ?? false,
        mastered: current?.mastered ?? false,
        ...fields,
        updated_at: new Date().toISOString(),
      };
      setData((d) => ({ ...d, topicProgress: d.topicProgress.filter((t) => t.topic_id !== topicId).concat(next) }));
      repo.saveTopicProgress(next).catch(fail);
    },
    [fail]
  );

  const saveProfile = useCallback(
    async (p: Profile) => {
      setData((d) => ({ ...d, profile: p }));
      await repo.saveProfile(p).catch(fail);
    },
    [fail]
  );

  const saveMockExam: Ctx["saveMockExam"] = useCallback(
    (m) => {
      const next: MockExamResult = { ...m, id: newId(), created_at: new Date().toISOString() };
      setData((d) => ({ ...d, mockExams: [...d.mockExams, next] }));
      repo.insertMockExam(next).catch(fail);
    },
    [fail]
  );

  const signOut = useCallback(async () => {
    await repo.signOut();
    window.location.href = "/login";
  }, []);

  const value: Ctx = {
    ...data,
    loading,
    error,
    email,
    reviewByQuestion,
    recordAnswer,
    setErrorCause,
    markTopic,
    saveProfile,
    saveMockExam,
    signOut,
  };

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData() {
  const c = useContext(UserDataContext);
  if (!c) throw new Error("useUserData outside UserDataProvider");
  return c;
}
