"use client";

import { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import { useAutoClearWhen, useAutoDismiss } from "@/hooks/useAutoDismiss";
import { friendlyUserError, userMsg } from "@/lib/callErrors";
import {
  ENGLISH_END_MESSAGE,
  ENGLISH_FIRST_MESSAGE,
  ENGLISH_SYSTEM_PROMPT,
} from "@/lib/englishSystemPrompt";
import {
  ENGLISH_LOCK,
  URDU_LOCK_REINFORCE,
  URDU_SYSTEM_PROMPT,
} from "@/lib/urduSystemPrompt";
import {
  IDLE_STEP_SECONDS,
  VOICE_SPEED,
  endCallPhrasesFor,
  idleLines,
  isAssistantGoodbye,
  isUserHangupRequest,
  speechCaptureOverrides,
} from "@/lib/speechConfig";

type TranscriptLine = { role: string; text: string };
type Lang = "english" | "urdu";

const IDLE_MS = IDLE_STEP_SECONDS * 1000;

const OPENINGS: Record<Lang, string> = {
  english: ENGLISH_FIRST_MESSAGE,
  urdu:
    "Assalam o alaikum, main Alex hoon Vantora se. Hum teams ka rozmarra kaam automate karte hain taake time bache. Tees seconds? Main short aur clear rakhta hoon.",
};

const END_MSG: Record<Lang, string> = {
  english: ENGLISH_END_MESSAGE,
  urdu: "Aapke time ka shukriya. Allah hafiz!",
};

const UI = {
  english: {
    eyebrow: "Recruiter free test",
    title: "Call Agent",
    lede: "Choose English or Urdu, then start the call. Language stays locked for that call.",
    langLabel: "Language",
    lockedLive: "Locked for this call",
    start: "Call Agent (English)",
    end: "End call",
    loading: "Loading…",
    ready: "Ready · English selected",
    endedStatus: "Conversation ended — recording saved in Call History",
    speaking: "Alex is speaking…",
    listening: "Listening…",
    selectInfo: "English selected — the call will start in English.",
    endedOk: "Call finished normally. Open Call History to play the recording.",
  },
  urdu: {
    eyebrow: "Recruiter free test",
    title: "Call Agent",
    lede: "Pehle English ya Urdu choose karein, phir call start karein. Is call ke liye language lock rehti hai.",
    langLabel: "Language",
    lockedLive: "Is call ke liye lock",
    start: "Call Agent (Urdu)",
    end: "End call",
    loading: "Loading…",
    ready: "Ready · Urdu selected",
    endedStatus: "Call khatam — recording Call History mein save hai",
    speaking: "Alex bol raha hai…",
    listening: "Sun raha hai… boliye",
    selectInfo: "Urdu selected — the call will start in Urdu.",
    endedOk: "Call theek se khatam hui. Recording Call History se sunain.",
  },
} as const;

function isBenignHangupError(message: string): boolean {
  return /meeting has ended|meeting ended|ejected|ejection|left the call|call ended|connection.*closed|websocket.*close|daily|hangup|ended reason|bye/i.test(
    message
  );
}

function errorText(e: unknown): string {
  if (typeof e === "string") return e;
  if (typeof e === "object" && e && "message" in e) {
    return String((e as { message: string }).message);
  }
  try {
    return JSON.stringify(e);
  } catch {
    return "";
  }
}

type ConvMsg = { role?: string; message?: string; content?: string };

function linesFromConversation(messages: ConvMsg[]): TranscriptLine[] {
  return messages
    .map((m) => {
      const text = (m.message || m.content || "").trim();
      if (!text) return null;
      if (m.role === "system" || m.role === "tool" || m.role === "function") return null;
      const role = m.role === "bot" || m.role === "assistant" ? "Alex" : "You";
      return { role, text };
    })
    .filter((x): x is TranscriptLine => Boolean(x));
}

function mergeTranscript(
  fromConversation: TranscriptLine[],
  prev: TranscriptLine[]
): TranscriptLine[] {
  if (!fromConversation.length) return prev;
  const key = (l: TranscriptLine) => `${l.role}|${l.text.toLowerCase()}`;
  const seen = new Set(fromConversation.map(key));
  const extras = prev.filter((l) => l.role === "You" && !seen.has(key(l)));
  return [...fromConversation, ...extras].slice(-60);
}

export default function TalkToAgent() {
  const vapiRef = useRef<Vapi | null>(null);
  const endingRef = useRef(false);
  const startedRef = useRef(false);
  const langRef = useRef<Lang>("english");
  /** 0 = first check, 1 = second check, 2 = polite end */
  const idleStepRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hangupDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Wait until Alex finishes speaking, then start the 2s hangup delay */
  const pendingEndAfterSpeechRef = useRef(false);
  const speakingRef = useRef(false);
  const boostCtxRef = useRef<AudioContext | null>(null);
  const boostGainRef = useRef<GainNode | null>(null);
  const boostHookedPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [language, setLanguage] = useState<Lang>("english");
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);

  const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY || "";
  const assistantId = process.env.NEXT_PUBLIC_VAPI_ASSISTANT_ID || "";
  const copy = UI[language];

  const LIVE_VOICE_GAIN = 5.5;

  function maxVapiVolume(vapi: Vapi) {
    try {
      vapi.setVolume(1);
    } catch {
      /* ignore */
    }
  }

  function tearDownVoiceBoost() {
    try {
      boostCtxRef.current?.close();
    } catch {
      /* ignore */
    }
    boostCtxRef.current = null;
    boostGainRef.current = null;
    boostHookedPlayerRef.current = null;
  }

  function amplifyAssistantAudio(player: HTMLAudioElement) {
    try {
      player.volume = 1;
      player.muted = false;
    } catch {
      /* ignore */
    }

    if (boostHookedPlayerRef.current === player && boostGainRef.current) {
      boostGainRef.current.gain.value = LIVE_VOICE_GAIN;
      return;
    }

    tearDownVoiceBoost();

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(player);
      const gain = ctx.createGain();
      gain.gain.value = LIVE_VOICE_GAIN;
      source.connect(gain);
      gain.connect(ctx.destination);
      boostCtxRef.current = ctx;
      boostGainRef.current = gain;
      boostHookedPlayerRef.current = player;
      void ctx.resume();
    } catch {
      /* native volume=1 still applied */
    }
  }

  function clearIdleTimer() {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }

  function clearHangupDelay() {
    if (hangupDelayRef.current) {
      clearTimeout(hangupDelayRef.current);
      hangupDelayRef.current = null;
    }
  }

  function resetIdleSteps() {
    idleStepRef.current = 0;
    clearIdleTimer();
  }

  /** Hard stop the Daily/VAPI call */
  function hardStopCall() {
    const vapi = vapiRef.current;
    if (!vapi) return;
    try {
      vapi.send({ type: "end-call" });
    } catch {
      /* ignore */
    }
    try {
      void vapi.stop();
    } catch {
      /* ignore */
    }
  }

  /** Start / restart the exact 2s hangup timer */
  function armHangupDelay(ms = 2000) {
    clearHangupDelay();
    hangupDelayRef.current = setTimeout(() => {
      hangupDelayRef.current = null;
      pendingEndAfterSpeechRef.current = false;
      hardStopCall();
    }, ms);
  }

  /**
   * After goodbye finishes: wait 2s then MUST hang up.
   * Also keeps a safety timer if speech-end never fires.
   */
  function scheduleCallEndAfterSpeech(ms = 2000) {
    endingRef.current = true;
    resetIdleSteps();
    pendingEndAfterSpeechRef.current = true;
    // If already not speaking (line already done), cut in ms
    if (!speakingRef.current) {
      armHangupDelay(ms);
      return;
    }
    // While speaking: speech-end will arm 2s; safety net if speech-end missed
    clearHangupDelay();
    hangupDelayRef.current = setTimeout(() => {
      hangupDelayRef.current = null;
      pendingEndAfterSpeechRef.current = false;
      hardStopCall();
    }, 8000);
  }

  function forceHangupFromUser() {
    const vapi = vapiRef.current;
    if (!vapi) return;
    if (endingRef.current && hangupDelayRef.current) return;

    endingRef.current = true;
    resetIdleSteps();
    const bye =
      langRef.current === "urdu"
        ? "Theek hai. Aapke time ka shukriya. Allah hafiz!"
        : "Got it — thanks for your time. Goodbye!";
    try {
      // endCallAfterSpoken=true so VAPI also ends after the line
      vapi.say(bye, true, true, true);
    } catch {
      /* ignore */
    }
    speakingRef.current = true;
    pendingEndAfterSpeechRef.current = true;
    // Absolute: hang up 2s after we expect the short bye to finish (~1.5s + 2s)
    clearHangupDelay();
    hangupDelayRef.current = setTimeout(() => {
      hangupDelayRef.current = null;
      pendingEndAfterSpeechRef.current = false;
      hardStopCall();
    }, 3500);
  }

  /**
   * After Alex finishes (or after an idle nudge): wait 5s.
   * Step 0 → presence check · Step 1 → ask again · Step 2 → polite end.
   * Live language ref picks EN / UR lines (never English while Urdu selected).
   */
  function armIdleTimer() {
    clearIdleTimer();
    if (!startedRef.current || endingRef.current) return;

    idleTimerRef.current = setTimeout(() => {
      const vapi = vapiRef.current;
      if (!vapi || endingRef.current || !startedRef.current) return;

      const lines = idleLines(langRef.current === "urdu" ? "ur" : "en");
      const step = idleStepRef.current;

      if (step === 0) {
        idleStepRef.current = 1;
        try {
          vapi.say(lines.check1, false, true, true);
        } catch {
          armIdleTimer();
        }
        return;
      }

      if (step === 1) {
        idleStepRef.current = 2;
        try {
          vapi.say(lines.check2, false, true, true);
        } catch {
          armIdleTimer();
        }
        return;
      }

      clearIdleTimer();
      try {
        vapi.say(lines.end, false, true, true);
      } catch {
        /* ignore */
      }
      // Full goodbye line first — hang up 2s after speech-end
      scheduleCallEndAfterSpeech(2000);
    }, IDLE_MS);
  }

  function buildOverrides(lang: Lang) {
    const code = lang === "urdu" ? "ur" : "en";
    // Client idle only — blocks base assistant English “Are you there?” hooks
    const speech = speechCaptureOverrides(code, { clientManagedIdle: true });

    if (lang === "urdu") {
      return {
        firstMessage: OPENINGS.urdu,
        endCallMessage: END_MSG.urdu,
        endCallPhrases: endCallPhrasesFor("ur"),
        variableValues: { preferredLanguage: "Urdu" },
        model: {
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          temperature: 0.35,
          maxTokens: 110,
          messages: [{ role: "system", content: URDU_SYSTEM_PROMPT }],
        },
        voice: {
          provider: "vapi",
          voiceId: "Elliot",
          language: "en",
          speed: VOICE_SPEED,
        },
        ...speech,
      };
    }

    return {
      firstMessage: OPENINGS.english,
      endCallMessage: END_MSG.english,
      endCallPhrases: endCallPhrasesFor("en"),
      variableValues: { preferredLanguage: "English" },
      model: {
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        temperature: 0.35,
        maxTokens: 110,
        messages: [{ role: "system", content: ENGLISH_SYSTEM_PROMPT }],
      },
      voice: {
        provider: "vapi",
        voiceId: "Elliot",
        language: "en",
        speed: VOICE_SPEED,
      },
      ...speech,
    };
  }

  const forceHangupRef = useRef(forceHangupFromUser);
  forceHangupRef.current = forceHangupFromUser;

  function onAssistantLine(text: string) {
    if (!isAssistantGoodbye(text)) return;
    // Don't keep resetting the timer on every partial transcript
    if (endingRef.current && (pendingEndAfterSpeechRef.current || hangupDelayRef.current)) {
      return;
    }
    scheduleCallEndAfterSpeech(2000);
  }

  const onAssistantLineRef = useRef(onAssistantLine);
  onAssistantLineRef.current = onAssistantLine;

  async function startSession(lang: Lang) {
    if (!vapiRef.current || !assistantId) {
      throw new Error(userMsg("configMissing"));
    }
    await vapiRef.current.start(assistantId, buildOverrides(lang) as never);
    maxVapiVolume(vapiRef.current);
    if (boostGainRef.current) {
      boostGainRef.current.gain.value = LIVE_VOICE_GAIN;
    }
  }

  useAutoDismiss(error, () => setError(""), 5000);
  useAutoDismiss(info, () => setInfo(""), 5000);
  useAutoClearWhen(ended && !active, () => {
    setEnded(false);
    setTranscript([]);
    setInfo("");
  });

  useEffect(() => {
    langRef.current = language;
  }, [language]);

  useEffect(() => {
    if (!publicKey) {
      setError(userMsg("configMissing"));
      return;
    }

    const vapi = new Vapi(publicKey);
    vapiRef.current = vapi;
    maxVapiVolume(vapi);

    vapi.on("audio", (player: HTMLAudioElement) => {
      maxVapiVolume(vapi);
      amplifyAssistantAudio(player);
    });

    vapi.on("call-start", () => {
      endingRef.current = false;
      startedRef.current = true;
      setActive(true);
      setEnded(false);
      setError("");
      setTranscript([]);
      resetIdleSteps();
      maxVapiVolume(vapi);

      try {
        const lang = langRef.current;
        vapi.send({
          type: "add-message",
          message: {
            role: "system",
            content: lang === "urdu" ? URDU_LOCK_REINFORCE : ENGLISH_LOCK,
          },
        });
      } catch {
        /* ignore */
      }
    });

    vapi.on("speech-start", () => {
      speakingRef.current = true;
      setSpeaking(true);
      clearIdleTimer();
      maxVapiVolume(vapi);
      if (boostGainRef.current) {
        boostGainRef.current.gain.value = LIVE_VOICE_GAIN;
      }
      if (boostCtxRef.current?.state === "suspended") {
        void boostCtxRef.current.resume();
      }
    });

    vapi.on("speech-end", () => {
      speakingRef.current = false;
      setSpeaking(false);
      if (pendingEndAfterSpeechRef.current) {
        pendingEndAfterSpeechRef.current = false;
        clearHangupDelay();
        armHangupDelay(2000);
        return;
      }
      if (!endingRef.current) {
        armIdleTimer();
      }
    });

    vapi.on("call-end", () => {
      endingRef.current = true;
      pendingEndAfterSpeechRef.current = false;
      resetIdleSteps();
      clearHangupDelay();
      setActive(false);
      setSpeaking(false);
      speakingRef.current = false;
      tearDownVoiceBoost();
      if (startedRef.current) {
        setEnded(true);
        setError("");
      }
      startedRef.current = false;
    });

    vapi.on(
      "message",
      (message: {
        type?: string;
        role?: string;
        transcript?: string;
        transcriptType?: string;
        messages?: ConvMsg[];
      }) => {
        if (message.type === "conversation-update" && Array.isArray(message.messages)) {
          const lines = linesFromConversation(message.messages);
          if (lines.length) {
            setTranscript((prev) => mergeTranscript(lines, prev));
            const last = lines[lines.length - 1];
            if (last?.role === "You" && isUserHangupRequest(last.text)) {
              forceHangupRef.current();
            }
            if (last?.role === "Alex") {
              onAssistantLineRef.current(last.text);
            }
          }
          return;
        }

        if (message.type === "transcript" && message.transcript) {
          const role = message.role === "assistant" || message.role === "bot" ? "Alex" : "You";
          const text = message.transcript.trim();
          if (!text) return;
          const isFinal = message.transcriptType === "final";

          // Hangup / goodbye: act on partials too (faster; STT often finalizes late)
          if (role === "You" && isUserHangupRequest(text)) {
            resetIdleSteps();
            forceHangupRef.current();
          }
          if (role === "Alex" && isAssistantGoodbye(text)) {
            onAssistantLineRef.current(text);
          }

          if (!isFinal) return;

          if (langRef.current === "urdu" && role === "Alex") {
            // Urdu: don't show noisy STT Alex lines; goodbye already handled above
            return;
          }

          if (role === "You") {
            resetIdleSteps();
          }

          setTranscript((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === role && (text.startsWith(last.text) || last.text.startsWith(text))) {
              return [...prev.slice(0, -1), { role, text }].slice(-60);
            }
            return [...prev, { role, text }].slice(-60);
          });
        }
      }
    );

    vapi.on("error", (e: unknown) => {
      if (endingRef.current) return;

      const msg = errorText(e);
      const hadSession = startedRef.current;

      if (hadSession && (!msg || isBenignHangupError(msg) || msg === "Voice connection error")) {
        endingRef.current = true;
        resetIdleSteps();
        startedRef.current = false;
        setActive(false);
        setSpeaking(false);
        tearDownVoiceBoost();
        setEnded(true);
        setError("");
        return;
      }

      endingRef.current = true;
      resetIdleSteps();
      startedRef.current = false;
      setActive(false);
      setSpeaking(false);
      tearDownVoiceBoost();
      setEnded(false);
      setError(friendlyUserError(msg || userMsg("mic")));
    });

    setReady(true);

    return () => {
      endingRef.current = true;
      resetIdleSteps();
      clearHangupDelay();
      tearDownVoiceBoost();
      vapi.stop();
      vapiRef.current = null;
    };
  }, [publicKey]);

  function applyLanguage(next: Lang) {
    // Mid-call live switch locked — only allow before the call starts
    if (active) return;
    if (next === language) return;
    setLanguage(next);
    langRef.current = next;
    setEnded(false);
    setInfo(UI[next].selectInfo);
  }

  async function toggle() {
    if (!vapiRef.current || !ready) return;

    if (!assistantId) {
      setError(userMsg("configMissing"));
      return;
    }

    if (active) {
      endingRef.current = true;
      resetIdleSteps();
      vapiRef.current.stop();
      return;
    }

    try {
      setError("");
      setInfo("");
      setEnded(false);
      endingRef.current = false;
      startedRef.current = false;
      await startSession(langRef.current);
    } catch (e) {
      startedRef.current = false;
      setActive(false);
      setEnded(false);
      const msg = e instanceof Error ? e.message : userMsg("mic");
      setError(friendlyUserError(msg));
    }
  }

  return (
    <section className="panel talk-panel">
      <div className="panel-head">
        <p className="eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p className="lede">{copy.lede}</p>
      </div>

      <div className="lang-switch" role="group" aria-label="Call language">
        <span className="lang-label">{copy.langLabel}</span>
        <button
          type="button"
          className={`lang-btn ${language === "english" ? "active" : ""}`}
          onClick={() => applyLanguage("english")}
          disabled={active}
          title={active ? copy.lockedLive : undefined}
        >
          English
        </button>
        <button
          type="button"
          className={`lang-btn ${language === "urdu" ? "active" : ""}`}
          onClick={() => applyLanguage("urdu")}
          disabled={active}
          title={active ? copy.lockedLive : undefined}
        >
          اردو · Urdu
        </button>
        {active && <span className="lang-live">{copy.lockedLive}</span>}
      </div>

      <div className={`pulse-wrap ${active ? "live" : ""} ${speaking ? "speaking" : ""}`}>
        <button
          type="button"
          className={`talk-btn ${active ? "stop" : "start"}`}
          onClick={() => void toggle()}
          disabled={!ready}
        >
          {active ? copy.end : copy.start}
        </button>
        <p className="status-line">
          {!ready && copy.loading}
          {ready && !active && !ended && copy.ready}
          {ready && !active && ended && copy.endedStatus}
          {active && speaking && copy.speaking}
          {active && !speaking && copy.listening}
        </p>
      </div>

      {error && <p className="error-box">{error}</p>}
      {info && !error && <p className="ok-box">{info}</p>}
      {!error && !info && ended && !active && <p className="ok-box">{copy.endedOk}</p>}

      {transcript.length > 0 && (
        <div className="live-transcript">
          {transcript.map((line, i) => (
            <p key={`${line.role}-${i}-${line.text.slice(0, 12)}`}>
              <strong>{line.role}:</strong> {line.text}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
