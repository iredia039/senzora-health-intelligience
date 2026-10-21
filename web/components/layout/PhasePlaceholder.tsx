import { VeluneMark } from "@/components/brand/Logo";

export function PhasePlaceholder({ phase, summary }: { phase: number; summary: string }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-card px-6 py-16 text-center">
      <VeluneMark px={40} />
      <h2 className="mt-5 text-lg font-semibold text-fg">This page arrives in phase {phase}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{summary}</p>
    </section>
  );
}
