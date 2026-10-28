"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { primaryButton, secondaryButton } from "@/components/ui/buttons";
import { toLocalInput } from "@/lib/format";
import { addReading, updateReading } from "@/lib/storage";
import type { Reading, ReadingInput } from "@/types";

const wholeNumberIssue = (raw: string, min: number, max: number, what: string): string | null => {
  const text = raw.trim();
  if (text === "") return `Enter ${what}.`;
  if (!/^\d+$/.test(text)) return "Use whole numbers only.";
  const n = Number(text);
  return n < min || n > max ? `Enter a value between ${min} and ${max}.` : null;
};

const schema = z
  .object({
    type: z.enum(["heart_rate", "blood_pressure"]),
    bpm: z.string(),
    systolic: z.string(),
    diastolic: z.string(),
    measuredAt: z.string(),
    notes: z.string().max(200, "Keep notes under 200 characters."),
  })
  .superRefine((v, ctx) => {
    const add = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    const when = Date.parse(v.measuredAt);
    if (Number.isNaN(when)) add("measuredAt", "Choose when you took this reading.");
    else if (when > Date.now() + 60_000) add("measuredAt", "This time is in the future. Choose when you took the reading.");

    if (v.type === "heart_rate") {
      const issue = wholeNumberIssue(v.bpm, 30, 220, "a heart rate");
      if (issue) add("bpm", issue);
      return;
    }
    const sys = wholeNumberIssue(v.systolic, 70, 260, "the top number (systolic)");
    const dia = wholeNumberIssue(v.diastolic, 40, 150, "the bottom number (diastolic)");
    if (sys) add("systolic", sys);
    if (dia) add("diastolic", dia);
    if (!sys && !dia && Number(v.systolic) <= Number(v.diastolic)) {
      add("systolic", "The top number must be higher than the bottom number.");
    }
  });

type FormValues = z.infer<typeof schema>;

const blank = (): FormValues => ({
  type: "heart_rate",
  bpm: "",
  systolic: "",
  diastolic: "",
  measuredAt: toLocalInput(new Date().toISOString()),
  notes: "",
});

const fromReading = (r: Reading): FormValues => ({
  type: r.type,
  bpm: r.type === "heart_rate" ? String(r.bpm) : "",
  systolic: r.type === "blood_pressure" ? String(r.systolic) : "",
  diastolic: r.type === "blood_pressure" ? String(r.diastolic) : "",
  measuredAt: toLocalInput(r.measuredAt),
  notes: r.notes ?? "",
});

const inputClass =
  "w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted aria-invalid:border-danger";

function Field({ name, label, hint, error, children }: { name: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="mt-0.5 text-xs text-muted">
          {hint}
        </p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReadingForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: Reading | null;
  onSaved: (message: string) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    setFocus,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: editing ? fromReading(editing) : blank() });

  const type = useWatch({ control, name: "type" });

  useEffect(() => {
    if (editing) setFocus(editing.type === "heart_rate" ? "bpm" : "systolic");
  }, [editing, setFocus]);

  const aria = (name: keyof FormValues, hint = false) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [hint ? `${name}-hint` : null, errors[name] ? `${name}-error` : null].filter(Boolean).join(" ") || undefined,
  });

  const onSubmit = (v: FormValues) => {
    const measuredAt = new Date(v.measuredAt).toISOString();
    const notes = v.notes.trim() || undefined;
    const input: ReadingInput =
      v.type === "heart_rate"
        ? { type: "heart_rate", bpm: Number(v.bpm), measuredAt, notes }
        : { type: "blood_pressure", systolic: Number(v.systolic), diastolic: Number(v.diastolic), measuredAt, notes };

    const saved = editing ? updateReading(editing.id, input) : addReading(input);
    if (!saved) {
      setError("root", { message: "Couldn't save this reading. Your browser is blocking storage for this site, so nothing can be kept on this device." });
      return;
    }
    if (!editing) reset({ ...blank(), type: v.type });
    onSaved(editing ? "Changes saved." : "Reading saved.");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-fg">Vital</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {(
            [
              ["heart_rate", "Heart rate"],
              ["blood_pressure", "Blood pressure"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg has-checked:border-accent-bright has-checked:bg-raised has-disabled:opacity-60"
            >
              <input type="radio" value={value} disabled={!!editing} className="accent-(--accent-bright)" {...register("type")} />
              {label}
            </label>
          ))}
        </div>
        {editing && <p className="mt-1.5 text-xs text-muted">The vital can&apos;t be changed on a saved reading. Delete it and record a new one instead.</p>}
      </fieldset>

      {type === "heart_rate" ? (
        <Field name="bpm" label="Heart rate (bpm)" hint="Beats per minute, for example 72." error={errors.bpm?.message}>
          <input id="bpm" inputMode="numeric" autoComplete="off" className={inputClass} {...aria("bpm", true)} {...register("bpm")} />
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field name="systolic" label="Top number (systolic)" hint="In mmHg, for example 120." error={errors.systolic?.message}>
            <input id="systolic" inputMode="numeric" autoComplete="off" className={inputClass} {...aria("systolic", true)} {...register("systolic")} />
          </Field>
          <Field name="diastolic" label="Bottom number (diastolic)" hint="In mmHg, for example 80." error={errors.diastolic?.message}>
            <input id="diastolic" inputMode="numeric" autoComplete="off" className={inputClass} {...aria("diastolic", true)} {...register("diastolic")} />
          </Field>
        </div>
      )}

      <Field name="measuredAt" label="When you took it" error={errors.measuredAt?.message}>
        <input id="measuredAt" type="datetime-local" className={inputClass} {...aria("measuredAt")} {...register("measuredAt")} />
      </Field>

      <Field name="notes" label="Notes (optional)" hint="For example: after a walk, or before breakfast." error={errors.notes?.message}>
        <textarea id="notes" rows={2} maxLength={200} className={inputClass} {...aria("notes", true)} {...register("notes")} />
      </Field>

      {errors.root?.message && (
        <p role="alert" className="text-sm text-danger">
          {errors.root.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className={primaryButton}>
          {editing ? "Save changes" : "Save reading"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} className={secondaryButton}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
