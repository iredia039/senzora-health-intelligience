"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getSessionSnapshot, parseSessionUser, subscribeToSession, type SessionUser } from "@/lib/session";

/** The logged-in user, or null when nobody is logged in. Updates on login and logout. */
export function useSessionUser(): SessionUser | null {
  const snapshot = useSyncExternalStore(subscribeToSession, getSessionSnapshot, () => "");
  return useMemo(() => parseSessionUser(snapshot), [snapshot]);
}
