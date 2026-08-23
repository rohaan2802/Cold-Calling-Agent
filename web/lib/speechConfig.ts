/**
 * Shared STT / turn-taking tuned so client speech is less often dropped.
 * Deepgram default endpointing (10ms) misses short / quiet utterances — use 300.
 */

/** Casual pace — not rushed, not slow (1.0 feels fast on Elliot) */
export const VOICE_SPEED = 0.8;

/** Seconds between idle nudge / end steps */
export const IDLE_STEP_SECONDS = 5;

const KEYWORDS = [
  "Vantora",
  "Vantora:2",
  "Alex",
  "demo",
  "email",
  "callback",
  "yes",
  "no",
  "okay",
  "ok",
  "hello",
  "interested",
  "busy",
  "call",
  "later",
];

export function deepgramTranscriber(language: "en" | "ur" | "multi") {
  return {
    provider: "deepgram" as const,
    model: "nova-3" as const,
    language,
    smartFormat: true,
    numerals: true,
    confidenceThreshold: 0.25,
    endpointing: 300,
    keywords: KEYWORDS,
  };
}

export const startSpeakingPlan = {
  waitSeconds: 0.7,
  smartEndpointingEnabled: true,
  transcriptionEndpointingPlan: {
    onPunctuationSeconds: 0.4,
    onNoPunctuationSeconds: 1.8,
    onNumberSeconds: 0.8,
  },
};

/**
 * Harder to barge-in — ambient noise / short sounds were cutting Alex mid-salam
 * ("Assalam…" then silence). Need several real words before he stops.
 */
export const stopSpeakingPlan = {
  numWords: 5,
  voiceSeconds: 0.4,
  backoffSeconds: 1.8,
  acknowledgementPhrases: [
    "okay",
    "ok",
    "yes",
    "yeah",
    "right",
    "sure",
    "uh-huh",
    "mm-hmm",
    "hmm",
    "haan",
    "han",
    "ji",
    "jee",
    "theek",
    "theek hai",
    "bilkul",
    "assalam",
    "assalam o alaikum",
    "walaikum",
    "walaikum assalam",
    "walikum",
    "walikum asalam",
  ],
};

export const IDLE_CHECK_1_EN = "Are you there?";
export const IDLE_CHECK_2_EN = "Still with me?";
export const IDLE_END_EN =
  "It seems you're busy right now — thanks for your time. Have a great day!";

export const IDLE_CHECK_1_UR = "Kya aap line pe hain?";
export const IDLE_CHECK_2_UR = "Aap sun rahe hain?";
export const IDLE_END_UR =
  "Lagta hai aap busy hain — shukriya. Allah hafiz!";

export function idleLines(language: "en" | "ur") {
  if (language === "ur") {
    return {
      check1: IDLE_CHECK_1_UR,
      check2: IDLE_CHECK_2_UR,
      end: IDLE_END_UR,
    };
  }
  return {
    check1: IDLE_CHECK_1_EN,
    check2: IDLE_CHECK_2_EN,
    end: IDLE_END_EN,
  };
}

/**
 * User wants the call hung up now (not a callback request).
 * Handles Roman + Urdu-script STT (nova-3 `ur` often returns Arabic letters).
 */
export function isUserHangupRequest(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;

  // Urdu / Arabic script forms
  if (
    /کال\s*(کٹ|کت|بند|ختم)/.test(raw) ||
    /(کٹ|کت|بند|ختم)\s*(کر\s*)?(دو|دے|دیں|کرو)/.test(raw) ||
    /فون\s*(رکھ|بند|کٹ)/.test(raw) ||
    /لائن\s*(کٹ|بند)/.test(raw) ||
    /قطع\s*کر/.test(raw)
  ) {
    return true;
  }

  const t = raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0600-\u06FF]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return false;

  // Plain callback booking — not hangup
  if (
    /^(ok |theek |haan |ji )?(call|callback) (kr|kar|karo|me|back)/.test(t) &&
    !/(cut|kat|kt|band|hang|end|khatam)/.test(t)
  ) {
    return false;
  }

  // Fuzzy: "call" near cut/kat/kt/band (STT: "call cut kr do", "all kt kr do")
  if (
    /call.{0,12}(cut|kat|kt|band|khatam)/.test(t) ||
    /(cut|kat|kt|band|khatam).{0,12}call/.test(t) ||
    /\ball\s*k[tu]\b/.test(t) ||
    /\bal+\s*k[tu]\b/.test(t) ||
    /\b(cut|kat|kt)\s*(the\s*)?(call|line|phone)?\s*(kr|kar)?\s*(do|deo|karo|krdo)?\b/.test(t) ||
    /\bhang\s*up\b/.test(t) ||
    /\bend\s*(the\s*)?call\b/.test(t) ||
    /\bband\s*(karo|krdo|kr\s*do|kardo|kar\s*do)\b/.test(t) ||
    /\bline\s*(cut|band|kat|kt)\b/.test(t) ||
    /\bphone\s*(rakh|band|cut|kat)\b/.test(t) ||
    /\bdisconnect\b/.test(t) ||
    /\bstop\s*(the\s*)?call\b/.test(t)
  ) {
    return true;
  }

  return false;
}

/** Alex said a closing goodbye — hang up ~2s after (Roman + Urdu script) */
export function isAssistantGoodbye(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  if (/اللہ\s*حافظ/.test(raw) || /خدا\s*حافظ/.test(raw)) return true;

  const t = raw.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    /\ballah\s*hafiz\b/.test(t) ||
    /\bkhuda\s*hafiz\b/.test(t) ||
    /\bkhudahafiz\b/.test(t) ||
    /\ballahhafiz\b/.test(t) ||
    /\bgoodbye\b/.test(t) ||
    /\bgood\s*bye\b/.test(t) ||
    /\bhave a great day\b/.test(t) ||
    /\bit seems you.?re busy\b/.test(t) ||
    /\blagta hai aap\b.*\bbusy\b/.test(t) ||
    /\bthanks for your time\b/.test(t) ||
    /\baapke time ka shukriya\b/.test(t)
  );
}

export function endCallPhrasesFor(language: "en" | "ur"): string[] {
  if (language === "ur") {
    return [
      "allah hafiz",
      "khuda hafiz",
      "call khatam",
      "call cut",
      "call kat",
      "call kt",
      "call band",
      "line cut",
      "hang up",
      "end call",
    ];
  }
  return [
    "goodbye",
    "have a great day",
    "please hang up",
    "remove me",
    "stop calling",
    "don't call again",
    "hang up",
    "end call",
    "cut the call",
  ];
}

/**
 * Outbound / fixed-language: 5s check → 10s check → 15s polite end.
 * Each timeout is from last user speech (VAPI resets on speech).
 */
export function idlePresenceHooks(language: "en" | "ur") {
  const { check1, check2, end } = idleLines(language);

  return [
    {
      on: "customer.speech.timeout" as const,
      name: "idle_check_1",
      options: {
        timeoutSeconds: IDLE_STEP_SECONDS,
        triggerMaxCount: 1,
        triggerResetMode: "onUserSpeech" as const,
      },
      do: [{ type: "say" as const, exact: check1 }],
    },
    {
      on: "customer.speech.timeout" as const,
      name: "idle_check_2",
      options: {
        timeoutSeconds: IDLE_STEP_SECONDS * 2,
        triggerMaxCount: 1,
        triggerResetMode: "onUserSpeech" as const,
      },
      do: [{ type: "say" as const, exact: check2 }],
    },
    {
      on: "customer.speech.timeout" as const,
      name: "idle_end_call",
      options: {
        timeoutSeconds: IDLE_STEP_SECONDS * 3,
        triggerMaxCount: 1,
        triggerResetMode: "onUserSpeech" as const,
      },
      do: [
        { type: "say" as const, exact: end },
        { type: "tool" as const, tool: { type: "endCall" as const } },
      ],
    },
  ];
}

type SpeechOpts = {
  /**
   * Call Agent: idle nudges run in the browser from the live language ref,
   * so Urdu never hears English “Are you there?” from the base assistant hooks.
   */
  clientManagedIdle?: boolean;
};

/** Overrides shared by web Call Agent + outbound phone */
export function speechCaptureOverrides(
  language: "en" | "ur",
  opts: SpeechOpts = {}
) {
  const clientIdle = Boolean(opts.clientManagedIdle);

  return {
    transcriber: deepgramTranscriber(language),
    startSpeakingPlan,
    stopSpeakingPlan,
    backgroundDenoisingEnabled: true,
    /** Never barge into the opening greeting */
    firstMessageInterruptionsEnabled: false,
    silenceTimeoutSeconds: clientIdle ? 90 : 25,
    hooks: clientIdle ? [] : idlePresenceHooks(language),
    clientMessages: ["transcript", "conversation-update", "speech-update"] as string[],
  };
}
