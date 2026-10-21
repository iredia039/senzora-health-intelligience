// import type { Metadata } from "next";
// import { PhasePlaceholder } from "@/components/layout/PhasePlaceholder";

// export const metadata: Metadata = { title: "Overview" };

// export default function Page() {
//   return <PhasePlaceholder phase={2} summary="Your latest heart rate and blood pressure, charts, recent readings, and device status will appear here once vitals recording is built." />;
// }

import Link from "next/link";

const links = [
  { href: "/vitals", title: "Vitals", text: "Log your readings and see them in one place." },
  { href: "/find-care", title: "Find Care", text: "Search for medicines and nearby pharmacies." },
  { href: "/chat", title: "Ask Velune", text: "Get plain-language answers about your health." },
];

export default function DashboardPage() {
  return (
    <div className="min-h-full bg-[#06111a] px-4 py-10 text-white">
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-[#081a24] p-8 sm:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative">
          <span className="inline-block rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-teal-300">
            Early preview
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-[#3fd9c0] to-[#2fb88e] bg-clip-text text-transparent">
              Velune
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-300">
            Your health, better understood. Log vitals, find care near you, and
            ask questions in plain language.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-6 grid max-w-4xl gap-4 sm:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-white/10 bg-[#0a1b25] p-5 transition hover:border-teal-400/50 hover:bg-[#0c2330]"
          >
            <h2 className="font-semibold text-white group-hover:text-teal-300">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-slate-400">{item.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
