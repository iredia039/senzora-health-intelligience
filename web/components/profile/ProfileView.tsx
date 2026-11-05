"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getProfile } from "@/lib/auth";
import { getSessionSnapshot, parseSessionUser, subscribeToSession, type SessionUser } from "@/lib/session";
import OverviewSection from "./OverviewSection";
import PersonalSection from "./PersonalSection";
import SecuritySection from "./SecuritySection";
import UnavailableSection from "./UnavailableSection";
import { card, primaryButton, secondaryButton } from "./ui";

type SectionId = "overview" | "personal" | "health" | "emergency" | "preferences" | "security";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "personal", label: "Personal information" },
  { id: "health", label: "Health information" },
  { id: "emergency", label: "Emergency contacts" },
  { id: "preferences", label: "Preferences" },
  { id: "security", label: "Privacy & security" },
];

/** True only in the browser, so nothing flashes in before the saved login has been checked. */
function useReady() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export default function ProfileView() {
  const ready = useReady();
  const snapshot = useSyncExternalStore(subscribeToSession, getSessionSnapshot, () => "");
  const user = parseSessionUser(snapshot || null);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-md py-10">
        <section className={`${card} space-y-4 text-center`}>
          <h1 className="text-xl font-semibold text-fg">Log in to see your profile</h1>
          <p className="text-sm text-fg/70">Your name, email and password settings are here once you are logged in.</p>
          <div className="flex justify-center gap-3">
            <Link href="/login" className={primaryButton}>
              Log in
            </Link>
            <Link href="/register" className={secondaryButton}>
              Register
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // The key resets every form if a different account logs in while this page is open.
  return <ProfileContent key={user.id} user={user} />;
}

function ProfileContent({ user }: { user: SessionUser }) {
  const [section, setSection] = useState<SectionId>("overview");
  const [email, setEmail] = useState<string | null>(null);
  const [emailFailed, setEmailFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getProfile()
      .then((profile) => {
        if (active) setEmail(profile.email);
      })
      .catch(() => {
        if (active) setEmailFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const emailText = email ?? (emailFailed ? "Email unavailable right now" : "Loading email…");

  return (
    <div className="mx-auto w-full max-w-5xl py-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <nav aria-label="Profile sections" className="flex gap-2 overflow-x-auto pb-1 md:w-56 md:shrink-0 md:flex-col md:overflow-visible md:pb-0">
          {SECTIONS.map((item) => {
            const active = item.id === section;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setSection(item.id)}
                className={`shrink-0 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[#5CE1E6]/60 ${
                  active ? "bg-[#5CE1E6] text-[#071321]" : "border border-line text-fg hover:bg-card"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 space-y-6">
          {section === "overview" && <OverviewSection user={user} emailText={emailText} onEdit={() => setSection("personal")} />}
          {section === "personal" && <PersonalSection user={user} emailText={emailText} />}
          {section === "health" && (
            <UnavailableSection
              title="Health information"
              items={["Blood group, height and weight", "Known allergies", "Existing medical conditions", "Current medications", "Relevant medical history"]}
            />
          )}
          {section === "emergency" && (
            <UnavailableSection
              title="Emergency contacts"
              items={["Contact name, relationship and phone number", "Relevant emergency medical information", "Known severe allergies"]}
            />
          )}
          {section === "preferences" && (
            <UnavailableSection
              title="Preferences"
              items={["Measurement units (kg or lbs) and temperature units (°C or °F)", "Monitoring and notification preferences", "Daily health reminders", "Preferred healthcare facility and pharmacy"]}
            />
          )}
          {section === "security" && <SecuritySection />}
        </div>
      </div>
    </div>
  );
}
