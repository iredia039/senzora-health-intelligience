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
import { byNewest } from "@/lib/analysis";

const noopSubscribe = () => () => {};

// False on server/hydration, true in browser — guards localStorage reads
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

// Readings hook — newest first, reactive across tabs
export function useReadings(): { ready: boolean; readings: Reading[] } {
  const ready = useHydrated();
  const raw = useSyncExternalStore(subscribeToStorage, getReadingsSnapshot, () => "");
  const readings = useMemo(
    () => (ready ? loadReadings().sort(byNewest) : []),
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

// Chat messages — oldest first
export function useChat(): { ready: boolean; messages: ChatMessage[] } {
  const ready = useHydrated();
  const raw = useSyncExternalStore(subscribeToStorage, getChatSnapshot, () => "");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `raw` changes whenever the stored chat changes
  const messages = useMemo(() => (ready ? loadChat() : []), [ready, raw]);
  return { ready, messages };
}
