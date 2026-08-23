/**
 * User-facing errors only — never show raw API / field paths like "customer.number".
 */

const MSG = {
  phoneRequired: "Please enter a phone number.",
  phoneInvalid:
    "Enter a valid phone number with country code. Example for US: +14155552671",
  phoneTooShort: "That number is too short. Include country code, e.g. +1…",
  phoneUsOnly:
    "This line can only call US numbers (+1…). Use a US TextMe number, or import Telnyx/Twilio for other countries.",
  creditsGone:
    "Calling credits are finished. Web and phone calls cannot start until the account wallet is topped up.",
  dailyLimit:
    "Daily outbound call limit reached for the free phone line. Try again tomorrow, or use an imported Telnyx / Vonage / Twilio number.",
  billingBlocked:
    "Calling is blocked by account billing. Check the voice provider dashboard and try again.",
  network:
    "Network problem. Check your internet connection and try again.",
  mic:
    "Could not start the call. Allow microphone access and try again.",
  genericStart:
    "Could not start the call. Please try again in a moment.",
  genericFail:
    "Something went wrong. Please try again.",
  loadCalls:
    "Could not load call history. Please refresh and try again.",
  callNotFound:
    "This call was not found or was deleted.",
  deleteFail:
    "Could not delete this call. Please try again.",
  recordingUnavailable:
    "Recording is not ready yet. Wait about a minute after the call ends, then refresh.",
  recordingPlay:
    "Could not play this recording. Refresh the page and try again.",
  recordingDownload:
    "Could not download this recording. Refresh and try again.",
  configMissing:
    "App setup is incomplete. Contact the project owner to check API keys.",
  outboundStarted:
    "Call started. When it ends, open Call History to play the recording.",
} as const;

export type UserMsgKey = keyof typeof MSG;

export function userMsg(key: UserMsgKey): string {
  return MSG[key];
}

/** Flatten unknown API / SDK error shapes into one string */
export function extractRawError(input: unknown): string {
  if (input == null) return "";
  if (typeof input === "string") return input;
  if (Array.isArray(input)) {
    return input.map((x) => extractRawError(x)).filter(Boolean).join(" ");
  }
  if (typeof input === "object") {
    const o = input as Record<string, unknown>;
    if (o.message != null) return extractRawError(o.message);
    if (o.error != null) return extractRawError(o.error);
    if (o.msg != null) return extractRawError(o.msg);
    try {
      return JSON.stringify(input);
    } catch {
      return "";
    }
  }
  return String(input);
}

/**
 * Normalize phone to E.164-ish (+digits). Returns null if invalid for dialing.
 */
export function normalizePhoneE164(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let cleaned = trimmed.replace(/[^\d+]/g, "");
  if (cleaned.includes("+")) {
    cleaned = `+${cleaned.replace(/\+/g, "")}`;
  }

  // US local 10 digits → assume +1
  if (/^\d{10}$/.test(cleaned)) {
    cleaned = `+1${cleaned}`;
  }

  if (!cleaned.startsWith("+")) {
    cleaned = `+${cleaned}`;
  }

  // E.164: + then 8–15 digits total after +
  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export function validateOutboundPhone(input: string): { ok: true; e164: string } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: MSG.phoneRequired };
  }

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 8) {
    return { ok: false, error: MSG.phoneTooShort };
  }

  const e164 = normalizePhoneE164(trimmed);
  if (!e164) {
    return { ok: false, error: MSG.phoneInvalid };
  }

  return { ok: true, e164 };
}

/** Always returns a short, human message — never leaks field names like customer.number */
export function friendlyUserError(raw: unknown): string {
  const msg = extractRawError(raw).toLowerCase();

  if (!msg) return MSG.genericFail;

  // E.164 / customer.number validation from VAPI
  if (
    msg.includes("customer.number") ||
    msg.includes("e.164") ||
    msg.includes("e164") ||
    (msg.includes("phone") && msg.includes("valid")) ||
    msg.includes("country code") ||
    msg.includes("longer than or equal") ||
    msg.includes("must be a valid phone")
  ) {
    return MSG.phoneInvalid;
  }

  if (
    msg.includes("insufficient-credits") ||
    msg.includes("insufficient credits") ||
    (msg.includes("credit") &&
      (msg.includes("insufficient") || msg.includes("empty") || msg.includes("exhaust") || msg.includes("wallet")))
  ) {
    return MSG.creditsGone;
  }

  if (
    msg.includes("daily-limit") ||
    msg.includes("outbound-daily") ||
    msg.includes("daily outbound") ||
    msg.includes("outbound phone call per day")
  ) {
    return MSG.dailyLimit;
  }

  if (
    msg.includes("international") ||
    msg.includes("vapi-number-international") ||
    msg.includes("only call us") ||
    msg.includes("us only")
  ) {
    return MSG.phoneUsOnly;
  }

  if (msg.includes("frozen") || msg.includes("subscription-frozen") || msg.includes("fraud-check")) {
    return MSG.billingBlocked;
  }

  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("timeout") ||
    msg.includes("load failed")
  ) {
    return MSG.network;
  }

  if (
    msg.includes("permission") ||
    msg.includes("microphone") ||
    msg.includes("notallowederror") ||
    msg.includes("getusermedia")
  ) {
    return MSG.mic;
  }

  if (
    msg.includes("missing") &&
    (msg.includes("key") || msg.includes("assistant") || msg.includes("env") || msg.includes("phone_number"))
  ) {
    return MSG.configMissing;
  }

  if (msg.includes("not found") || msg.includes("deleted") || msg.includes("404")) {
    return MSG.callNotFound;
  }

  if (msg.includes("recording") && (msg.includes("unavailable") || msg.includes("not ready") || msg.includes("empty"))) {
    return MSG.recordingUnavailable;
  }

  if (msg.includes("recording") || msg.includes("playback") || msg.includes("decode")) {
    return MSG.recordingPlay;
  }

  if (msg.includes("delete")) {
    return MSG.deleteFail;
  }

  // If it still looks like a developer / schema error, hide it
  if (
    msg.includes("statuscode") ||
    msg.includes("bad request") ||
    msg.includes("validation") ||
    msg.includes(".number") ||
    msg.includes("dto") ||
    msg.includes("stack") ||
    msg.includes("typescript") ||
    msg.includes("{") ||
    msg.includes("hot tip")
  ) {
    return MSG.genericStart;
  }

  // Short plain sentences can pass through; long/tech dumps get replaced
  if (msg.length > 180 || /https?:\/\//i.test(msg) || msg.includes(" at ")) {
    return MSG.genericFail;
  }

  // Capitalize first letter of a safe short message
  const cleaned = extractRawError(raw).replace(/\s+/g, " ").trim();
  if (cleaned.length >= 12 && cleaned.length <= 160 && !cleaned.includes("customer.")) {
    return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
  }

  return MSG.genericFail;
}

/** @deprecated use friendlyUserError */
export function friendlyCallError(raw: string): string {
  return friendlyUserError(raw);
}
