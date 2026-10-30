"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Moon, Sun } from "lucide-react";
import { dangerButton, primaryButton, secondaryButton } from "@/components/ui/buttons";
import { readingsToCsv } from "@/lib/export/csv";
import { downloadFile, todayStamp } from "@/lib/export/download";
import { useChat, useHydrated, usePreferences, useReadings } from "@/lib/hooks/useStoredData";
import { setTheme, useTheme } from "@/lib/hooks/useTheme";
import {
  hasAssistantConsent,
  loadChat,
  loadPreferences,
  loadReadings,
  resetAllData,
  savePreferences,
  subscribeToStorage,
  withdrawAssistantConsent,
} from "@/lib/storage";

const NAME_MAX = 40;
const inputClass = "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted aria-invalid:border-danger";

function Card({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-card p-5">
      <h2 id={id} className="font-display text-lg font-semibold text-fg">
        {title}
      </h2>
      {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileCard() {
  const prefs = usePreferences();
  const [name, setName] = useState(prefs.displayName);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === "") {
      setError("Enter the name you want Senzora to show.");
      setMessage("");
      return;
    }
    const ok = savePreferences({ ...loadPreferences(), displayName: trimmed });
    setError(ok ? "" : "Couldn't save your name. Your browser is blocking storage for this site.");
    setMessage(ok ? "Name saved." : "");
    if (ok) setName(trimmed);
  };

  return (
    <Card id="profile-heading" title="Profile" description="This name appears in the sidebar and on your overview. It stays on this device.">
      <form onSubmit={save} noValidate className="max-w-md space-y-3">
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-fg">
            Display name
          </label>
          <input
            id="display-name"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "display-name-error" : "age-note"}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} mt-1.5`}
          />
          {error && (
            <p id="display-name-error" className="mt-1.5 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
        <p id="age-note" className="text-xs leading-relaxed text-muted">
          Senzora&apos;s analysis rules are written for adults only. Other age groups are not supported yet.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={primaryButton}>
            Save name
          </button>
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        </div>
      </form>
    </Card>
  );
}

function AppearanceCard() {
  const theme = useTheme();
  const options = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
  ] as const;
  return (
    <Card id="appearance-heading" title="Appearance" description="Senzora opens in dark mode unless you choose light.">
      <div role="group" aria-label="Theme" className="inline-flex rounded-xl border border-line bg-canvas p-1">
        {options.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              theme === value ? "bg-raised text-accent-bright" : "text-muted hover:text-fg"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function NotificationsCard() {
  const { alertsEnabled } = usePreferences();
  const [error, setError] = useState("");

  const toggle = () => {
    const ok = savePreferences({ ...loadPreferences(), alertsEnabled: !alertsEnabled });
    setError(ok ? "" : "Couldn't save this setting. Your browser is blocking storage for this site.");
  };

  return (
    <Card id="alerts-heading" title="Alerts" description="Senzora can show a red dot on the bell at the top of every page. It does not send messages or emails.">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" checked={alertsEnabled} onChange={toggle} className="mt-0.5 size-4 accent-(--accent-bright)" />
        <span>
          <span className="block text-sm font-medium text-fg">Show a dot when a recent reading was flagged</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">It appears when any reading from the last 7 days was flagged or urgent.</span>
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}

function AssistantConsentCard() {
  const given = useSyncExternalStore(subscribeToStorage, hasAssistantConsent, () => false);
  const [status, setStatus] = useState("");

  const withdraw = () => {
    const ok = withdrawAssistantConsent();
    setStatus(
      ok
        ? "Consent withdrawn. The assistant will ask for your agreement again before you use it."
        : "Couldn't withdraw consent. Your browser is blocking storage for this site.",
    );
  };

  return (
    <Card
      id="consent-heading"
      title="Assistant consent"
      description="The assistant needs your agreement before it can be used. You can take that agreement back at any time."
    >
      <p className="text-sm text-fg">{given ? "You have agreed to use the assistant." : "You have not agreed to use the assistant."}</p>
      {given && (
        <button type="button" onClick={withdraw} className={`${secondaryButton} mt-3`}>
          Withdraw consent
        </button>
      )}
      <p role="status" className="mt-3 min-h-5 text-sm text-muted">
        {status}
      </p>
    </Card>
  );
}

function PrivacyCard() {
  return (
    <Card id="privacy-heading" title="Privacy">
      <ul className="max-w-2xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
        <li>Your readings, name, settings and assistant chat are saved in this browser on this device. There is no account and nothing is uploaded.</li>
        <li>The assistant is a prototype. It writes its replies on this device from your saved readings and sends nothing to an online service.</li>
        <li>Find Care uses your location only while you search, and never saves it.</li>
        <li>Clearing your browser data, or using Delete everything below, removes it all. Someone else using this browser profile could see it.</li>
        <li>Senzora gives general information, not a diagnosis. It does not replace a health professional.</li>
      </ul>
    </Card>
  );
}

function DataCard() {
  const { readings } = useReadings();
  const { messages } = useChat();
  const [status, setStatus] = useState("");
  const [confirming, setConfirming] = useState(false);
  const empty = readings.length === 0 && messages.length === 0;

  const exportCsv = () => {
    downloadFile(`senzora-readings-${todayStamp()}.csv`, readingsToCsv(readings), "text/csv;charset=utf-8");
    setStatus(`Exported ${readings.length} reading${readings.length === 1 ? "" : "s"} to a CSV file.`);
  };

  const exportAll = () => {
    const everything = { exportedAt: new Date().toISOString(), preferences: loadPreferences(), readings: loadReadings(), chat: loadChat() };
    downloadFile(`senzora-data-${todayStamp()}.json`, JSON.stringify(everything, null, 2), "application/json");
    setStatus("Exported everything Senzora has saved to a JSON file.");
  };

  const reset = () => {
    resetAllData();
    document.documentElement.dataset.theme = "dark";
    setConfirming(false);
    setStatus("Everything was deleted from this device.");
  };

  return (
    <Card
      id="data-heading"
      title="Your data"
      description={`Saved on this device: ${readings.length} reading${readings.length === 1 ? "" : "s"} and ${messages.length} chat message${messages.length === 1 ? "" : "s"}.`}
    >
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={exportCsv} disabled={readings.length === 0} className={secondaryButton}>
          <Download className="size-4" aria-hidden="true" />
          Export readings (CSV)
        </button>
        <button type="button" onClick={exportAll} disabled={empty} className={secondaryButton}>
          <Download className="size-4" aria-hidden="true" />
          Export everything (JSON)
        </button>
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <h3 className="text-sm font-medium text-fg">Delete everything</h3>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
          Removes all readings, your chat, your name and your theme from this device. This can&apos;t be undone, so export first if you want a copy.
        </p>
        {confirming ? (
          <div role="group" aria-label="Confirm deleting all data" className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-fg">Delete all saved data?</span>
            <button type="button" onClick={reset} className={dangerButton}>
              Delete everything
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={secondaryButton}>
              Keep my data
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => { setConfirming(true); setStatus(""); }} className={`${dangerButton} mt-3`}>
            Delete everything
          </button>
        )}
      </div>

      <p role="status" className="mt-4 min-h-5 text-sm text-muted">
        {status}
      </p>
    </Card>
  );
}

export function SettingsView() {
  const ready = useHydrated();

  if (!ready) {
    return (
      <div aria-busy="true" className="rounded-2xl border border-line bg-card px-6 py-16 text-center text-sm text-muted">
        Loading your settings
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <ProfileCard />
      <AppearanceCard />
      <NotificationsCard />
      <AssistantConsentCard />
      <PrivacyCard />
      <DataCard />
    </div>
  );
}