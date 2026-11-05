import { card } from "./ui";

type Props = { title: string; items: string[] };

/** A section that has no backend yet. It says so and stores nothing. */
export default function UnavailableSection({ title, items }: Props) {
  return (
    <section aria-labelledby="unavailable-title" className={card}>
      <h2 id="unavailable-title" className="text-lg font-semibold text-fg">
        {title}
      </h2>
      <p className="mt-1 text-sm text-fg/70">Not available yet. Nothing here is stored or shown until it is built.</p>
      <p className="mt-5 text-sm font-medium text-fg">This section will cover:</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-fg/70">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
