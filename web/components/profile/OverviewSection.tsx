import type { SessionUser } from "@/lib/session";
import { card, secondaryButton } from "./ui";

type Props = { user: SessionUser; emailText: string; onEdit: () => void };

export default function OverviewSection({ user, emailText, onEdit }: Props) {
  return (
    <>
      <section aria-label="Profile overview" className={`${card} flex flex-wrap items-center gap-4`}>
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#5CE1E6] text-2xl font-semibold text-[#071321]"
        >
          {user.name.trim().charAt(0).toUpperCase() || "S"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold text-fg">{user.name}</h1>
          <p className="truncate text-sm text-fg/70">{emailText}</p>
        </div>
        <button type="button" onClick={onEdit} className={secondaryButton}>
          Edit profile
        </button>
      </section>

      <section aria-labelledby="health-summary-title" className={card}>
        <h2 id="health-summary-title" className="text-lg font-semibold text-fg">
          Health summary
        </h2>
        <p className="mt-1 text-sm text-fg/70">No health details yet. Blood group, height, weight and allergies will show here once health information is available.</p>
      </section>
    </>
  );
}
