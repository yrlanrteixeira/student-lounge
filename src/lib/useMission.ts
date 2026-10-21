"use client";

import { useMemo } from "react";
import { useUserData } from "./data/UserDataProvider";
import { buildMission } from "./plan";
import { today } from "./dates";

export function useMission() {
  const { profile, answers, reviews, topicProgress } = useUserData();
  const day = today();
  return useMemo(() => buildMission({ profile, answers, reviews, topicProgress, day }), [profile, answers, reviews, topicProgress, day]);
}
