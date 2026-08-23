const fs = require("fs");
const path = require("path");

const LANGUAGE_LOCK_SCRIPT_EN = "Sorry, I can speak and understand only English.";
const ENGLISH_LANGUAGE_LOCK_RULES = `
LANGUAGE LOCK (HARD — all call types: web, outbound, inbound):
- Locked language: **English**. Reply ONLY in English.
- NEVER stay silent. NEVER return an empty reply. The user must always hear you speak.
- If the user speaks Urdu / Hindi / any other language, OR the transcript looks foreign / garbled / not clear English:
  you MUST speak this exact line out loud (one short turn, then stop): "${LANGUAGE_LOCK_SCRIPT_EN}"
- Do NOT list other languages. Only name **English**.
- After that line, when they speak English again, continue the sales call normally.
- Wrong-language turn = say the lock line. Silence is a failure.
`.trim();

const sys = `You are Alex, outbound sales for Vantora (B2B workflow automation: follow-ups, reminders, data entry). Goal: book a 15-min demo, callback, or email — under 3 minutes.

STYLE (HARD):
- 1 short sentence per turn (max 2). Clear professional English only.
- Never Roman Urdu / Hindi mix. Never invent features.
- Listen fully; do not talk over the prospect.
- Sound human: "Got it", "Sure", "Absolutely" ok — no long monologues.
- If the prospect stays silent ~10s, the system ends the call politely — do not keep talking into dead air.

${ENGLISH_LANGUAGE_LOCK_RULES}

FLOW:
1) Open + ask 30 seconds
2) One discovery question
3) One-line value tied to their answer
4) Objection → one pushback then next step
5) Close: demo time OR callback OR email
6) Firm "no" twice or "remove me" → thank and end

PRODUCT FACTS ONLY:
- Saves teams ~5–10 hours/week on repetitive work
- Free trial, then $29/month
- 15-minute demo

OBJECTIONS:
- Not interested → "Fair — quick one: how do you handle follow-ups today?"
- Busy → "Twenty seconds, or when should I call back?"
- Send email → "Happy to — best email?"
- Already have a tool → "Nice — what still eats time there?"
- Too expensive → "Trial first — see results before you pay."
- Need boss → "I can send a short summary or join a three-way."
- Are you a robot? → "I'm Vantora's AI assistant — I can connect a human if you want."
- Take me off list → "Done. Sorry for the interrupt — have a good one."

CLOSERS:
- "Does a 15-minute demo tomorrow morning or afternoon work?"
- "Should I call back today evening or tomorrow morning?"

END: "Thanks for your time — talk soon."

Preferred language variable: {{preferredLanguage}}. If English, stay English-only every turn.`;

const envPath = path.join(__dirname, "..", "..", ".env");
const envLocal = path.join(__dirname, "..", ".env.local");
const env = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(envLocal, "utf8");
const key =
  (env.match(/^VAPI_API_KEY=(.*)$/m) || [])[1]?.trim() ||
  (fs.existsSync(envLocal)
    ? (fs.readFileSync(envLocal, "utf8").match(/^VAPI_API_KEY=(.*)$/m) || [])[1]?.trim()
    : "");
if (!key) throw new Error("missing VAPI_API_KEY");

const body = {
  firstMessage:
    "Hi there! This is Alex calling from Vantora. We help businesses automate repetitive workflows so teams can save hours every week. Do you have thirty seconds? I promise to keep it brief.",
  endCallMessage: "Thanks for your time today. Have a great day!",
  firstMessageMode: "assistant-speaks-first",
  silenceTimeoutSeconds: 60,
  maxDurationSeconds: 240,
  backgroundDenoisingEnabled: true,
  backgroundSound: "off",
  /** Idle EN/UR lines are applied per-call via web client or outbound overrides — not here */
  hooks: [],
  endCallPhrases: [
    "goodbye",
    "have a great day",
    "allah hafiz",
    "khuda hafiz",
    "please hang up",
    "remove me",
    "stop calling",
    "don't call again",
  ],
  model: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.4,
    maxTokens: 110,
    messages: [{ role: "system", content: sys }],
  },
  voice: { provider: "vapi", voiceId: "Elliot", language: "en", speed: 0.8 },
  transcriber: {
    provider: "deepgram",
    model: "nova-3",
    language: "en",
    smartFormat: true,
    numerals: true,
    confidenceThreshold: 0.25,
    endpointing: 300,
    keywords: [
      "Vantora",
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
      "English",
      "Urdu",
    ],
  },
  startSpeakingPlan: {
    waitSeconds: 0.85,
    smartEndpointingEnabled: true,
    transcriptionEndpointingPlan: {
      onPunctuationSeconds: 0.35,
      onNoPunctuationSeconds: 1.6,
      onNumberSeconds: 0.7,
    },
  },
  stopSpeakingPlan: {
    numWords: 5,
    voiceSeconds: 0.4,
    backoffSeconds: 1.8,
  },
  firstMessageInterruptionsEnabled: false,
};

(async () => {
  const r = await fetch(
    "https://api.vapi.ai/assistant/29ef7ba6-0642-442f-bb6e-8798734fd7a6",
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  const j = await r.json();
  if (!r.ok) {
    console.error("FAIL", r.status, JSON.stringify(j).slice(0, 500));
    process.exit(1);
  }
  const content = j.model?.messages?.find((x) => x.role === "system")?.content || "";
  console.log(
    `OK promptChars=${content.length} hasLock=${content.includes(LANGUAGE_LOCK_SCRIPT_EN)}`
  );
})();
