"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  DEFAULT_PREFERENCES,
  getChatSnapshot,
  getPreferencesSnapshot,
  getReadingsSnapshot,
  loadChat,
  loadPreferences,
  loadReadings,
  subscribeToStorage,
} from "@/lib/storage";
import type { ChatMessage, Preferences, Reading } from "@/types";

const noopSubscribe = () => () => {};

/** False on the server and during hydration, true afterwards, so saved data is only read in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Saved readings, newest first. Re-renders when readings change in this tab or another. */
export function useReadings(): { ready: boolean; readings: Reading[] } {
  const ready = useHydrated();
  const raw = useSyncExternalStore(subscribeToStorage, getReadingsSnapshot, () => "");
  const readings = useMemo(
    () => (ready ? loadReadings().sort((a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `raw` changes whenever the stored readings change
    [ready, raw],
  );
  return { ready, readings };
}

export function usePreferences(): Preferences {
  const ready = useHydrated();
  const raw = useSyncExternalStore(subscribeToStorage, getPreferencesSnapshot, () => "");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `raw` changes whenever the stored preferences change
  return useMemo(() => (ready ? loadPreferences() : DEFAULT_PREFERENCES), [ready, raw]);
}

/** The saved assistant conversation, oldest message first. */
export function useChat(): { ready: boolean; messages: ChatMessage[] } {
  const ready = useHydrated();
  const raw = useSyncExternalStore(subscribeToStorage, getChatSnapshot, () => "");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `raw` changes whenever the stored chat changes
  const messages = useMemo(() => (ready ? loadChat() : []), [ready, raw]);
  return { ready, messages };
}
