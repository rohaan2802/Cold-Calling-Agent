export type VapiCall = {
  id: string;
  type?: string;
  status?: string;
  endedReason?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt?: string;
  cost?: number;
  customer?: { number?: string; name?: string };
  phoneNumber?: { number?: string; id?: string };
  assistantId?: string;
  transcript?: string;
  summary?: string;
  /** Some list payloads expose recording at the top level */
  recordingUrl?: string;
  analysis?: {
    summary?: string;
    successEvaluation?: string;
  };
  artifact?: {
    transcript?: string;
    recording?: {
      mono?: { combinedUrl?: string; assistantUrl?: string; customerUrl?: string };
      stereoUrl?: string;
    };
    recordingUrl?: string;
    stereoRecordingUrl?: string;
    messages?: Array<{
      role?: string;
      message?: string;
      content?: string;
      time?: number;
    }>;
  };
};

export function getDurationSeconds(call: VapiCall): number | null {
  if (!call.startedAt || !call.endedAt) return null;
  const start = new Date(call.startedAt).getTime();
  const end = new Date(call.endedAt).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 1000);
}

export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function getTranscript(call: VapiCall): string {
  const fromMessages = (
    messages?: Array<{ role?: string; message?: string; content?: string }>
  ) => {
    if (!messages?.length) return "";
    return messages
      .map((m) => {
        const roleRaw = (m.role || "").toLowerCase();
        if (roleRaw === "system" || roleRaw === "tool" || roleRaw === "function") return "";
        const role = roleRaw === "bot" || roleRaw === "assistant" ? "Alex" : "Prospect";
        const text = String(m.message || m.content || "").trim();
        if (!text) return "";
        return `${role}: ${text}`;
      })
      .filter(Boolean)
      .join("\n");
  };

  const artifactText = (call.artifact?.transcript || "").trim();
  const topText = (call.transcript || "").trim();
  const msgText = fromMessages(call.artifact?.messages);

  // Prefer the richest non-empty source (messages often keep both sides when flat text is thin)
  const candidates = [artifactText, topText, msgText].filter(Boolean);
  if (!candidates.length) return "";
  return candidates.reduce((a, b) => (b.length > a.length ? b : a));
}

export function isDeletedCall(call: VapiCall): boolean {
  const reason = (call.endedReason || "").toLowerCase();
  return (
    reason === "call-deleted" ||
    reason === "scheduled-call-deleted" ||
    call.status === "not-found"
  );
}

/** True when VAPI stored a playable recording (top-level or artifact) */
export function hasRecording(call: VapiCall): boolean {
  const a = call.artifact;
  return Boolean(
    call.recordingUrl ||
      a?.recordingUrl ||
      a?.stereoRecordingUrl ||
      a?.recording?.mono?.combinedUrl ||
      a?.recording?.stereoUrl ||
      a?.recording?.mono?.assistantUrl ||
      a?.recording?.mono?.customerUrl
  );
}

/**
 * History should only include real completed conversations with audio.
 * Hides soft-deleted rows, failed outbound attempts, and empty stubs.
 */
export function shouldListInHistory(call: VapiCall): boolean {
  if (isDeletedCall(call)) return false;
  if (!hasRecording(call)) return false;

  const reason = (call.endedReason || "").toLowerCase();
  if (
    reason.includes("error") ||
    reason.includes("failed") ||
    reason.includes("daily-limit") ||
    reason.includes("insufficient-credits") ||
    reason.includes("fraud-check")
  ) {
    return false;
  }

  return true;
}

/** Friendly type for UI — never show raw VAPI enums */
export function getCallTypeLabel(call: VapiCall): string {
  const t = (call.type || "").toLowerCase();

  // Browser Call Agent (web SDK)
  if (t === "webcall" || t === "vapi.websocketcall" || t.includes("web")) {
    return "Call Agent";
  }

  // Someone dialed our number — not an outbound we placed
  if (t.includes("inbound")) {
    return "Inbound";
  }

  // Only true outbound dials from our dialer / API
  if (t.includes("outbound")) {
    return "Outbound";
  }

  // Fallback: phone customer without outbound type → still not "Outbound"
  if (call.customer?.number) return "Phone";
  return "Call Agent";
}

export function getOutcome(call: VapiCall): string {
  if (isDeletedCall(call)) return "Deleted";

  const summary = (
    call.analysis?.summary ||
    call.summary ||
    call.endedReason ||
    call.status ||
    "unknown"
  ).toLowerCase();

  if (summary.includes("do-not-call") || summary.includes("do not call")) return "Do not call";
  if (summary.includes("interested") && !summary.includes("not")) return "Interested";
  if (summary.includes("callback") || summary.includes("call back")) return "Callback";
  if (summary.includes("email")) return "Send email";
  if (summary.includes("not-interested") || summary.includes("not interested")) return "Not interested";
  if (call.status === "ended") return "Completed";
  return call.status || "Unknown";
}

function callTime(call: VapiCall): number {
  const raw = call.createdAt || call.startedAt || "";
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Chronological Call Agent index (oldest = 1) among sibling web calls.
 * Returns null when siblings were not provided (avoid faking "1" on detail).
 */
export function getCallAgentNumber(
  call: VapiCall,
  allCalls: VapiCall[]
): number | null {
  if (getCallTypeLabel(call) !== "Call Agent") return null;
  const webCalls = allCalls
    .filter((c) => getCallTypeLabel(c) === "Call Agent")
    .sort((a, b) => callTime(a) - callTime(b));
  const idx = webCalls.findIndex((c) => c.id === call.id);
  return idx >= 0 ? idx + 1 : null;
}

/** Phone number for phone calls, or numbered Call Agent 1 / 2 / … */
export function getCallLabel(call: VapiCall, allCalls: VapiCall[] = []): string {
  const typeLabel = getCallTypeLabel(call);

  if (
    (typeLabel === "Outbound" || typeLabel === "Inbound" || typeLabel === "Phone") &&
    call.customer?.number
  ) {
    return call.customer.number;
  }

  if (typeLabel === "Call Agent") {
    // Need the full history list — a single-call array would always yield "Call Agent 1"
    if (allCalls.length === 0) {
      return `Call Agent · ${call.id.slice(0, 8)}`;
    }
    const n = getCallAgentNumber(call, allCalls);
    if (n != null) return `Call Agent ${n}`;
    return `Call Agent · ${call.id.slice(0, 8)}`;
  }

  return call.customer?.number || call.phoneNumber?.number || "Call";
}

export const HIDDEN_CALLS_COOKIE = "vantora_hidden_calls";

export function parseHiddenCallIds(cookieHeader: string | null): Set<string> {
  if (!cookieHeader) return new Set();
  const parts = cookieHeader.split(";").map((p) => p.trim());
  const raw = parts.find((p) => p.startsWith(`${HIDDEN_CALLS_COOKIE}=`));
  if (!raw) return new Set();
  try {
    const value = decodeURIComponent(raw.slice(HIDDEN_CALLS_COOKIE.length + 1));
    const ids = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return new Set(ids);
  } catch {
    return new Set();
  }
}

export function buildHiddenCallsCookie(
  existing: Set<string>,
  addId: string
): string {
  const next = new Set(existing);
  next.add(addId);
  // Keep cookie reasonably small
  const ids = [...next].slice(-80);
  const value = encodeURIComponent(ids.join(","));
  return `${HIDDEN_CALLS_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export async function vapiFetch(path: string, init?: RequestInit) {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    throw new Error("VAPI_API_KEY is missing. Add it to web/.env.local");
  }

  const res = await fetch(`https://api.vapi.ai${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  return res;
}
