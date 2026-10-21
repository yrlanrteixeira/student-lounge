import type { Answer, MockExamResult, Profile, Review, TopicProgress } from "../types";
import { browserClient } from "../supabase/client";
import { fetchAll } from "../content";

export interface UserData {
  profile: Profile;
  answers: Answer[];
  reviews: Review[];
  topicProgress: TopicProgress[];
  mockExams: MockExamResult[];
}

export const DEFAULT_PROFILE: Profile = {
  name: "",
  exam_date: "2027-03-14",
  start_date: "2026-10-19",
  notebooklm: {},
};

let cachedUserId: string | null = null;
async function userId() {
  if (!cachedUserId) {
    const { data } = await browserClient().auth.getUser();
    cachedUserId = data.user?.id ?? null;
  }
  if (!cachedUserId) throw new Error("Sessão expirada. Entre de novo.");
  return cachedUserId;
}

export const repo = {
  async email() {
    const { data } = await browserClient().auth.getUser();
    return data.user?.email ?? null;
  },
  async load(): Promise<UserData> {
    const sb = browserClient();
    const [profile, answers, reviews, topicProgress, mockExams] = await Promise.all([
      sb.from("profiles").select("name, exam_date, start_date, notebooklm").maybeSingle(),
      fetchAll<Answer>((from, to) =>
        sb
          .from("answers")
          .select("id, question_id, subject_id, topic_id, traps, choice, correct, confidence, error_cause, time_sec, context, created_at")
          .order("created_at", { ascending: true })
          .range(from, to)
      ),
      fetchAll<Review>((from, to) => sb.from("reviews").select("question_id, stage, due_date, updated_at").range(from, to)),
      sb.from("topic_progress").select("topic_id, guide_read, mastered, updated_at"),
      sb.from("mock_exams").select("id, title, total, correct_count, by_block, duration_sec, created_at").order("created_at"),
    ]);
    return {
      profile: { ...DEFAULT_PROFILE, ...((profile.data as Partial<Profile> | null) ?? {}) },
      answers,
      reviews,
      topicProgress: (topicProgress.data as TopicProgress[] | null) ?? [],
      mockExams: (mockExams.data as MockExamResult[] | null) ?? [],
    };
  },
  async insertAnswer(a: Answer) {
    const { error } = await browserClient().from("answers").insert(a);
    if (error) throw error;
  },
  async setErrorCause(id: string, cause: Answer["error_cause"]) {
    const { error } = await browserClient().from("answers").update({ error_cause: cause }).eq("id", id);
    if (error) throw error;
  },
  async saveReview(r: Review) {
    const { error } = await browserClient().from("reviews").upsert({ user_id: await userId(), ...r }, { onConflict: "user_id,question_id" });
    if (error) throw error;
  },
  async saveTopicProgress(t: TopicProgress) {
    const { error } = await browserClient().from("topic_progress").upsert({ user_id: await userId(), ...t }, { onConflict: "user_id,topic_id" });
    if (error) throw error;
  },
  async saveProfile(p: Profile) {
    const { error } = await browserClient().from("profiles").upsert({ user_id: await userId(), ...p, updated_at: new Date().toISOString() });
    if (error) throw error;
  },
  async insertMockExam(m: MockExamResult) {
    const { error } = await browserClient().from("mock_exams").insert(m);
    if (error) throw error;
  },
  async signOut() {
    cachedUserId = null;
    await browserClient().auth.signOut();
  },
};
