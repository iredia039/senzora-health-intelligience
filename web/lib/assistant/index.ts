import { buildInsight, classifyReading, summarize, type Level } from "@/lib/analysis";
import { readingValue } from "@/lib/format";
import type { ChatMessage, Reading, VitalType } from "@/types";

/**
 * Prototype assistant. It runs on this device with fixed rules and reads only the saved readings.
 * `askAssistant` is the one function to swap later: replace its body with a call to the backend
 * chat endpoint and keep the same inputs and the same returned ChatMessage.
 */

const normalise = (text: string) => text.toLowerCase().replace(/[\u2018\u2019]/g, "'");

/** Phrases that mean "get help now". Checked before anything else. */
const EMERGENCY: RegExp[] = [
  /chest (pain|pressure|tightness)|tight(ness)? in (my|the) chest/,
  /(can't|cannot|hard to|struggling to) breathe|(difficulty|trouble) breathing/,
  /short(ness)? of breath/,
  /faint(ed|ing)?|passed out|unconscious|unresponsive/,
  /(face|arm|leg).{0,20}(droop|numb|weak)|slurred speech/,
  /seizure|convulsion/,
  /(severe|heavy|won't stop).{0,15}bleeding/,
];
const SELF_HARM = /suicid|kill myself|want to die|end my life|hurt myself/;

const SYMPTOMS =
  /headache|dizz|light-?headed|fever|cough|nause|vomit|pain|ache|tired|fatigue|weak|palpitat|racing heart|swelling|swollen|rash|diarrh|sore|flu\b|malaria|i feel|i'm feeling|feeling (sick|unwell|bad)|not feeling well/;
const ABOUT_READINGS = /blood pressure|\bbp\b|pressure|heart rate|pulse|heartbeat|bpm|reading|vitals?|trend|average|latest|lately|recent/;
const WANTS_HEART = /heart|pulse|bpm/;
const WANTS_BP = /blood pressure|\bbp\b|pressure/;

const FOOTER = "This is general information, not a diagnosis.";

const EMERGENCY_REPLY =
  "What you describe can be serious, and I can't assess it from here. Please contact your local emergency service or get to the nearest hospital now. If someone is with you, tell them what is happening.\n\nDo not wait to see whether it passes, and do not use this chat to decide what to do next. The Find Care page lists hospitals and clinics once you are safe.";

const SELF_HARM_REPLY =
  "I'm sorry you are in this much pain. You deserve support from a real person right now. Please contact your local emergency service or a crisis line in your country, or go to someone near you and tell them how you feel. If you can, stay with another person until help arrives.";

const HELP_REPLY =
  "I'm the Senzora prototype assistant. I can:\n\n- explain your saved blood pressure and heart rate readings\n- talk through how you feel and tell you when to get care\n\nI can't diagnose anything or replace a health professional. Try asking what your latest blood pressure means, or tell me what symptoms you have.";

const NOT_UNDERSTOOD_REPLY =
  "I couldn't match that to your readings or to a symptom. I can explain your saved blood pressure and heart rate, or talk through how you feel. Try asking \"How has my heart rate been lately?\" or describe a symptom.";

const NO_READINGS_REPLY =
  "You have no saved readings yet, so there is nothing for me to explain. Record a heart rate or blood pressure reading on the Vitals page and ask me again.";

const LEVEL_WORD: Record<Level, string> = { normal: "in range", caution: "flagged", urgent: "urgent" };

function readingsReply(text: string, readings: Reading[]): string {
  if (readings.length === 0) return NO_READINGS_REPLY;

  const asksHeart = WANTS_HEART.test(text);
  const asksBp = WANTS_BP.test(text);
  const types: VitalType[] = asksHeart && !asksBp ? ["heart_rate"] : asksBp && !asksHeart ? ["blood_pressure"] : ["blood_pressure", "heart_rate"];

  const parts = types.map((type) => {
    const insight = buildInsight(readings, type);
    const summary = summarize(readings, type);
    const lines = [`${insight.title}. ${insight.explanation}`];
    if (summary.average && summary.range) lines.push(`Across your ${summary.count} saved reading${summary.count === 1 ? "" : "s"}, the average is ${summary.average} and the range is ${summary.range}.`);
    if (insight.status !== "insufficient_data") lines.push(`What to do next: ${insight.nextStep}`);
    return lines.join("\n");
  });

  return `${parts.join("\n\n")}\n\n${FOOTER}`;
}

function symptomReply(readings: Reading[]): string {
  const latest = (["blood_pressure", "heart_rate"] as const)
    .map((type) => summarize(readings, type).latest)
    .filter((r): r is Reading => r !== undefined);

  const lines = ["Thanks for telling me. I can't diagnose what is causing this, but here is how to think about it."];

  if (latest.length > 0) {
    const described = latest.map((r) => `${r.type === "heart_rate" ? "heart rate" : "blood pressure"} ${readingValue(r)} (${LEVEL_WORD[classifyReading(r).level]})`);
    lines.push(`Your latest saved readings: ${described.join(" and ")}. A reading taken before you felt unwell may not reflect how you are now, so measure again if you can.`);
  }

  lines.push(
    "A health professional will want to know:\n- how long it has been going on\n- how strong it is, from 1 to 10\n- what makes it better or worse\n- any other symptoms, and any medicines you take",
    "Contact a health professional or your local emergency service now if it gets quickly worse, or you have chest pain, trouble breathing, confusion, fainting, or weakness on one side of the body. If it lasts more than a couple of days or worries you, see a clinician. The Find Care page can help you locate a hospital or clinic.",
    FOOTER,
  );
  return lines.join("\n\n");
}

export function replyTo(message: string, readings: Reading[]): string {
  const text = normalise(message);
  if (SELF_HARM.test(text)) return SELF_HARM_REPLY;
  if (EMERGENCY.some((rule) => rule.test(text))) return EMERGENCY_REPLY;
  if (SYMPTOMS.test(text)) return symptomReply(readings);
  if (ABOUT_READINGS.test(text)) return readingsReply(text, readings);
  if (/^(hi|hello|hey|yo|help|what can you)|what can you (do|help)|help me/.test(text)) return HELP_REPLY;
  return NOT_UNDERSTOOD_REPLY;
}

export async function askAssistant(history: ChatMessage[], readings: Reading[]): Promise<ChatMessage> {
  const lastQuestion = [...history].reverse().find((m) => m.role === "user");
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: replyTo(lastQuestion?.content ?? "", readings),
    createdAt: new Date().toISOString(),
    prototype: true,
  };
}
