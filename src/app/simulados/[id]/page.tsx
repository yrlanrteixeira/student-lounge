"use client";

import { use, useEffect, useState } from "react";
import { useUserData } from "@/lib/data/UserDataProvider";
import { INDEX, SUBJECTS, examYears, isTrainable, yearLabel } from "@/lib/content";
import { pickQuestions } from "@/lib/plan";
import { today } from "@/lib/dates";
import { MockExam } from "@/components/MockExam";
import { Loading } from "@/components/ui";

export default function MockExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { loading, answers } = useUserData();
  const [ids, setIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (loading || ids) return;
    if (id === "formato-2027") {
      const seen = new Set(answers.map((a) => a.question_id));
      // Portuguese: one contiguous block of 16 from the least seen exam (keeps passages whole)
      const ptYear = examYears()
        .map((year) => ({ year, seen: INDEX.filter((q) => q.year === year && q.subject === "portugues" && seen.has(q.id)).length }))
        .sort((x, y) => x.seen - y.seen)[0]?.year;
      const pt = INDEX.filter((q) => q.year === ptYear && q.subject === "portugues" && isTrainable(q)).slice(0, 16).map((q) => q.id);
      const rest = SUBJECTS.filter((s) => s.id !== "portugues").flatMap((s) =>
        pickQuestions({
          pool: INDEX.filter((q) => q.subject === s.id && (s.id !== "atualidades_pcd" || q.topic === "atu.pcd")),
          n: s.exam_questions,
          answers,
          seed: `mock:${today()}:${s.id}`,
        })
      );
      setIds([...pt, ...rest]);
    } else {
      setIds(INDEX.filter((q) => q.year === id).map((q) => q.id));
    }
  }, [loading, ids, id, answers]);

  if (!ids) return <Loading />;
  const title = id === "formato-2027" ? "Simulado formato 2027" : `Prova TJSP ${yearLabel(id)}`;
  const minutes = ids.length > 70 ? 300 : 240;
  return <MockExam ids={ids} title={title} minutes={minutes} />;
}
