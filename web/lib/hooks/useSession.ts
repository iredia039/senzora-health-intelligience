"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getSessionSnapshot, parseSessionUser, subscribeToSession, type SessionUser } from "@/lib/session";

export function useSessionUser(): SessionUser | null {
  const snapshot = useSyncExternalStore(subscribeToSession, getSessionSnapshot, () => "");
  return useMemo(() => parseSessionUser(snapshot), [snapshot]);
}
