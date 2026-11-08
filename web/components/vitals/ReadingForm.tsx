"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { primaryButton, secondaryButton } from "@/components/ui/buttons";
import { toLocalInput } from "@/lib/format";
import { useSessionUser } from "@/lib/hooks/useSession";
import { addReading, updateReading } from "@/lib/storage";
import type { Reading, ReadingInput } from "@/types";

const wholeNumberIssue = (raw: string, min: number, max: number, what: string): string | null => {
  const text = raw.trim();
  if (text === "") return `Enter ${what}.`;
  if (!/^\d+$/.test(text)) return "Use whole numbers only.";
  const n = Number(text);
  return n < min || n > max ? `Enter a value between ${min} and ${max}.` : null;
};

/** One decimal place at most, and a comma is accepted in place of a dot. */
const decimalIssue = (raw: string, min: number, max: number, what: string): string | null => {
  const text = raw.trim().replace(",", ".");
  if (text === "") return `Enter ${what}.`;
  if (!/^\d{1,2}(\.\d)?$/.test(text)) return "Use a number with at most one decimal place, for example 36.8.";
  const n = Number(text);
  return n < min || n > max ? `Enter a value between ${min} and ${max}.` : null;
};

const toNumber = (raw: string) => Number(raw.trim().replace(",", "."));

const schema = z
  .object({
    type: z.enum(["heart_rate", "blood_pressure", "body_temperature", "blood_oxygen"]),
    bpm: z.string(),
    systolic: z.string(),
    diastolic: z.string(),
    celsius: z.string(),
    spo2: z.string(),
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

    if (v.type === "body_temperature") {
      const issue = decimalIssue(v.celsius, 30, 45, "a body temperature");
      if (issue) add("celsius", issue);
      return;
    }

    if (v.type === "blood_oxygen") {
      const issue = wholeNumberIssue(v.spo2, 50, 100, "a blood oxygen level");
      if (issue) add("spo2", issue);
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
  celsius: "",
  spo2: "",
  measuredAt: toLocalInput(new Date().toISOString()),
  notes: "",
});

const fromReading = (r: Reading): FormValues => ({
  type: r.type,
  bpm: r.type === "heart_rate" ? String(r.bpm) : "",
  systolic: r.type === "blood_pressure" ? String(r.systolic) : "",
  diastolic: r.type === "blood_pressure" ? String(r.diastolic) : "",
  celsius: r.type === "body_temperature" ? r.celsius.toFixed(1) : "",
  spo2: r.type === "blood_oxygen" ? String(r.spo2) : "",
  measuredAt: toLocalInput(r.measuredAt),
  notes: r.notes ?? "",
});

function toInput(v: FormValues, measuredAt: string, notes: string | undefined): ReadingInput {
  switch (v.type) {
    case "heart_rate":
      return { type: "heart_rate", bpm: Number(v.bpm), measuredAt, notes };
    case "body_temperature":
      return { type: "body_temperature", celsius: toNumber(v.celsius), measuredAt, notes };
    case "blood_oxygen":
      return { type: "blood_oxygen", spo2: Number(v.spo2), measuredAt, notes };
    case "blood_pressure":
      return { type: "blood_pressure", systolic: Number(v.systolic), diastolic: Number(v.diastolic), measuredAt, notes };
  }
}

const FIRST_FIELD = { heart_rate: "bpm", blood_pressure: "systolic", body_temperature: "celsius", blood_oxygen: "spo2" } as const;

const VITAL_OPTIONS = [
  ["heart_rate", "Heart rate"],
  ["blood_pressure", "Blood pressure"],
  ["body_temperature", "Body temperature"],
  ["blood_oxygen", "Blood oxygen"],
] as const;

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
  const user = useSessionUser();
  const pathname = usePathname();
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
    if (editing) setFocus(FIRST_FIELD[editing.type]);
  }, [editing, setFocus]);

  const aria = (name: keyof FormValues, hint = false) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": [hint ? `${name}-hint` : null, errors[name] ? `${name}-error` : null].filter(Boolean).join(" ") || undefined,
  });

  const onSubmit = (v: FormValues) => {
    const measuredAt = new Date(v.measuredAt).toISOString();
    const notes = v.notes.trim() || undefined;
    const input = toInput(v, measuredAt, notes);

    const saved = editing ? updateReading(editing.id, input) : addReading(input);
    if (!saved) {
      setError("root", { message: "Couldn't save this reading. Your browser is blocking storage for this site, so nothing can be kept on this device." });
      return;
    }
    if (!editing) reset({ ...blank(), type: v.type });
    onSaved(editing ? "Changes saved." : "Reading saved.");
  };

  // Readings belong to an account, so without a login there is no form, only a way to log in or sign up.
  if (!user) {
    const next = `?next=${encodeURIComponent(pathname)}`;
    return (
      <div className="mt-4 rounded-xl border border-dashed border-line px-5 py-8 text-center">
        <p className="text-sm font-medium text-fg">Log in to record readings</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Readings are saved to your account on this device, so you need to be logged in first.</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Link href={`/login${next}`} className={`${primaryButton} inline-flex items-center justify-center`}>
            Log in
          </Link>
          <Link href={`/register${next}`} className={`${secondaryButton} inline-flex items-center justify-center`}>
            Sign up
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-fg">Vital</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {VITAL_OPTIONS.map(([value, label]) => (
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

      {type === "heart_rate" && (
        <Field name="bpm" label="Heart rate (bpm)" hint="Beats per minute, for example 72." error={errors.bpm?.message}>
          <input id="bpm" inputMode="numeric" autoComplete="off" className={inputClass} {...aria("bpm", true)} {...register("bpm")} />
        </Field>
      )}

      {type === "blood_pressure" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field name="systolic" label="Top number (systolic)" hint="In mmHg, for example 120." error={errors.systolic?.message}>
            <input id="systolic" inputMode="numeric" autoComplete="off" className={inputClass} {...aria("systolic", true)} {...register("systolic")} />
          </Field>
          <Field name="diastolic" label="Bottom number (diastolic)" hint="In mmHg, for example 80." error={errors.diastolic?.message}>
            <input id="diastolic" inputMode="numeric" autoComplete="off" className={inputClass} {...aria("diastolic", true)} {...register("diastolic")} />
          </Field>
        </div>
      )}

      {type === "body_temperature" && (
        <Field name="celsius" label="Body temperature (°C)" hint="In degrees Celsius, for example 36.8." error={errors.celsius?.message}>
          <input id="celsius" inputMode="decimal" autoComplete="off" className={inputClass} {...aria("celsius", true)} {...register("celsius")} />
        </Field>
      )}

      {type === "blood_oxygen" && (
        <Field name="spo2" label="Blood oxygen (SpO2, %)" hint="A whole number from a pulse oximeter, for example 97." error={errors.spo2?.message}>
          <input id="spo2" inputMode="numeric" autoComplete="off" className={inputClass} {...aria("spo2", true)} {...register("spo2")} />
        </Field>
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
