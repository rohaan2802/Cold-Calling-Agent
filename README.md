# Cold-Calling AI Voice Agent (Vantora · Alex)

> Likva9 technical assessment — production-style cold-calling AI voice agent with live web demo, outbound phone calls, call recordings, transcripts, English/Urdu switching, and a clear path to full autopilot.

| | |
|---|---|
| **Status** | ✅ Live + source on GitHub |
| **Live Demo** | https://web-rouge-xi-23.vercel.app |
| **GitHub** | https://github.com/rohaan2802/Cold-Calling-Agent |
| **Deadline** | 25 August 2026 |
| **Brand / Agent** | **Vantora** · **Alex** |
| **Built by** | Rohaan |
| **Email for submission** | contact@likva9.tech |

---

## Quick answers (read this first)

### Do VAPI credits renew every day?

**No.**

| Thing | Renews daily? | What it is |
|-------|---------------|------------|
| **VAPI wallet credits (~$10)** | **No — one-time** when you create the account | Spent on every web/phone call (STT + LLM + TTS + VAPI platform fee). When empty, calls stop until you top up. |
| **Free VAPI US phone number — outbound limit** | **Yes (~10 outbound attempts/day)** | Separate from credits. Even with money left, free numbers throttle outbound. Failed dials can count. |
| **Groq** | Free tier (rate limits) | LLM used via VAPI |
| **Vercel Hobby** | Free hosting | Live site stays up while project exists |

**Important:** Paying $1–2 into VAPI wallet **does not** remove the free-number daily outbound cap. For more outbound, import Twilio / Telnyx / Vonage (or wait for the next day’s free-number reset).

Official refs: [VAPI Pricing](https://docs.vapi.ai/pricing) · [VAPI Free Telephony](https://docs.vapi.ai/free-telephony) · [Outbound calling](https://docs.vapi.ai/calls/outbound-calling)

### Live link

**https://web-rouge-xi-23.vercel.app**

Stays live indefinitely while the Vercel project + env keys stay active and VAPI still has credits.

**Source:** https://github.com/rohaan2802/Cold-Calling-Agent (public)

---

## Table of Contents

1. [Live link, uptime & evaluator guide](#1-live-link-uptime--evaluator-guide)
2. [Platforms & links (full stack)](#2-platforms--links-full-stack)
3. [Credits, limits & costs (VAPI / Groq / Vercel)](#3-credits-limits--costs-vapi--groq--vercel)
4. [What is a cold-calling AI voice agent?](#4-what-is-a-cold-calling-ai-voice-agent)
5. [What works today (shipped features)](#5-what-works-today-shipped-features)
6. [Architecture (step by step)](#6-architecture-step-by-step)
7. [Project map — which file does what](#7-project-map--which-file-does-what)
8. [Language switching (English / Urdu)](#8-language-switching-english--urdu)
9. [Call History rules (what appears)](#9-call-history-rules-what-appears)
10. [Setup guide (step by step)](#10-setup-guide-step-by-step)
11. [Configuration & customization](#11-configuration--customization)
12. [Deployment](#12-deployment)
13. [Improvements & how advanced it can get](#13-improvements--how-advanced-it-can-get)
14. [Full automation vision (autopilot)](#14-full-automation-vision-autopilot)
15. [Testing checklist](#15-testing-checklist)
16. [Troubleshooting](#16-troubleshooting)
17. [Submission](#17-submission)
18. [Changelog](#18-changelog)
19. [GitHub (source)](#19-github-source)

---

## 1. Live link, uptime & evaluator guide

| Item | Detail |
|------|--------|
| **Live Demo** | https://web-rouge-xi-23.vercel.app |
| **Hosting** | [Vercel](https://vercel.com) (Hobby / free) |
| **How long live?** | Indefinite while project + account stay active |
| **Can stop if** | Project deleted, env vars removed, or **VAPI credits exhausted** |

### How to evaluate (recommended order)

1. Open https://web-rouge-xi-23.vercel.app  
2. Select **English** or **Urdu** → **Call Agent** → allow microphone  
3. Talk naturally; try objections (“busy”, “send email”, “not interested”)  
4. End call → **Call History** → open a call → **Play recording** + read transcript  
5. Optional: **Delete** a test call  
6. Optional: **Outbound** to a US `+1` number (subject to free-number daily limit)

> Prefer **Call Agent** for evaluation — it uses credits but does **not** burn the free phone daily outbound quota.

### Outbound test status (assessment note)

**A full successful outbound phone test was not completed** during this build window because the **VAPI free US number hit the daily outbound call limit** (org-level ~10 attempts/day; failed dials can count). Web **Call Agent**, recordings, transcripts, EN/Urdu, and inbound labeling were verified instead. Outbound should be re-tested after the free-number quota resets, or after importing Twilio / Telnyx / Vonage.

### Language lock (all call types)

Once a language is locked for a call (**web Call Agent**, **outbound**, or **inbound** after language is set):

- Agent replies **only** in that language.
- If the user speaks another language, Alex must say exactly one lock line naming **only** the locked language:  
  - **English lock:** `Sorry, I can speak and understand only English.`  
  - **Urdu lock (khalis Roman Urdu):** `Mazrat, main sirf Urdu hi bolta aur samajhta hoon.`  
- Do **not** list multiple languages. After the lock line, if they speak the locked language again, continue the call normally.
- Inbound **language picker menu** (offer EN in English / UR in Urdu at call start) is still **planned** below; until then inbound uses the assistant default (English) with the same lock script.

---

## 2. Platforms & links (full stack)

| Platform | Role | Links |
|----------|------|-------|
| **VAPI** | Voice orchestration, web calls, outbound, recordings, transcripts | [vapi.ai](https://vapi.ai) · [Dashboard](https://dashboard.vapi.ai) · [Docs](https://docs.vapi.ai) |
| **Groq** | LLM (`llama-3.3-70b-versatile`) | [groq.com](https://groq.com) · [Console](https://console.groq.com) |
| **Deepgram** | Speech-to-text (via VAPI) | [deepgram.com](https://deepgram.com) · [Docs](https://developers.deepgram.com) |
| **Vercel** | Live Next.js hosting | [vercel.com](https://vercel.com) |
| **Next.js 15** | App UI + API routes | [nextjs.org](https://nextjs.org) |
| **VAPI Voices (Elliot)** | Text-to-speech | Via VAPI assistant voice config |
| **VAPI Free US Number** | Outbound telephony (US-only on free) | Dashboard → Phone Numbers |

### Optional / future telephony (not required for this demo)

| Provider | Why | Link |
|----------|-----|------|
| Twilio | Import number → bypass free-number daily outbound cap | [twilio.com](https://www.twilio.com) |
| Telnyx | Same idea; often trial credits | [telnyx.com](https://telnyx.com) |
| Vonage | Import into VAPI | [vonage.com](https://www.vonage.com) |

---

## 2b. Free VAPI US number, TextMe testing & Twilio alternatives

### What is the free VAPI US number for?

When you create a **Free VAPI Number** (e.g. `+1 828 744 7146`), that number is the **caller ID / “from” line**.

| Question | Answer |
|----------|--------|
| Calls **go through** this number? | **Yes** — Alex dials **out from** this VAPI number |
| Calls **arrive on** this number for you to answer? | Only if someone dials **inbound** to it (optional). For our demo we use it mainly for **outbound** |
| Where is it configured? | VAPI Dashboard → **Phone Numbers** → copy **Phone Number ID** → `.env` as `VAPI_PHONE_NUMBER_ID` |
| Your TextMe number role? | TextMe = the **customer / “to”** number Alex calls |

```
Alex (VAPI free number +1828…)  ──calls──►  Your TextMe (+1…)
     FROM / caller ID                         TO / prospect (you)
```

### Fallback destination — what number to put?

**For basic outbound testing you usually leave Fallback empty / unused.**

| Field | When needed | What to put |
|-------|-------------|-------------|
| **Fallback destination** | Only if you enable **call transfer / human handoff** and the transfer fails | A real phone that should ring as backup (e.g. your TextMe `+1…`) |
| Outbound dialer on our site | Always | Prospect number = TextMe `+1…` in the form — **not** the VAPI number |

Do **not** put the VAPI free number as the outbound “to” number — that would try to call itself.

### How to test a free real call with TextMe (no Twilio)

1. Install **TextMe** → get a US number (`+1…`)  
2. Keep TextMe open, notifications ON  
3. Open live site → **Outbound Dialer**  
4. Enter your TextMe as E.164, e.g. `+12125551234`  
5. Tap **Call now**  
6. Answer on TextMe — caller ID should look like the **VAPI free number**  
7. After call → **Call History** → play recording  

**Limits:** free VAPI number ≈ **10 outbound attempts/day**, **US only**. If you already hit the limit today, wait until the next day reset (or use a paid import number).

**Credits:** each call still spends **one-time VAPI wallet credits** (not a daily credit gift).

### Twilio free alternatives (honest)

| Option | Free? | Notes |
|--------|-------|--------|
| **VAPI free US number** (what you have) | Yes | Best $0 path — daily outbound cap + US-only |
| **Wait for daily reset** | Yes | Same number, more attempts tomorrow |
| **Telnyx trial** | Often free credits | Buy/import number → VAPI Phone Numbers → Import ([telnyx.com](https://telnyx.com)) |
| **Vonage trial** | Trial credits common | Import into VAPI |
| **Twilio trial** | Often ~$15 trial credit | Number ~$1/mo after; most documented import |
| Extra free VAPI numbers | Yes | Does **not** remove the org daily outbound cap |

**There is no unlimited free Twilio clone.** Closest free path = VAPI free number + TextMe + wait for daily reset. Closest “pay almost nothing now” = Telnyx / Vonage / Twilio **trial**.

### Import path (when you want to bypass daily free-number limit)

1. Sign up Telnyx or Twilio → get a US number  
2. VAPI Dashboard → Phone Numbers → **Import**  
3. Put new Phone Number ID in `.env` / Vercel as `VAPI_PHONE_NUMBER_ID`  
4. Redeploy web  
5. Dial TextMe again from Outbound Dialer  

---

## 3. Credits, limits & costs (VAPI / Groq / Vercel)

### VAPI credits — **not** daily

| Fact | Detail |
|------|--------|
| Starter credit | About **$10 one-time** on new account signup |
| Daily renew? | **No** |
| Monthly free allowance? | **No** (usage-based after credits) |
| What spends credits | Web Call Agent + outbound phone + STT/TTS/LLM pipeline |
| After credits empty | Top up wallet / add payment method — otherwise voice calls fail |

### Free VAPI phone number — **daily** outbound limit

| Fact | Detail |
|------|--------|
| Daily renew? | **Yes** — outbound attempt quota resets per day |
| Typical cap | ~**10 outbound attempts/day** per org on free VAPI numbers |
| Destinations | **US (`+1`) only** on free numbers |
| Failed dials | Can still count toward the daily limit |
| Does topping up credits remove this? | **No** |
| How to scale outbound | Import Twilio / Telnyx / Vonage number into VAPI |

### Other free pieces

| Service | Cost model |
|---------|------------|
| Groq | Free API tier (rate limits apply) |
| Vercel Hobby | Free hosting for this demo |
| Deepgram | Billed through VAPI usage (covered by VAPI credits while they last) |

---

## 4. What is a cold-calling AI voice agent?

An AI that **talks like a human sales rep** on a live call:

1. Short intro + permission to continue  
2. Discovery questions  
3. Objection handling  
4. Ask for next step (demo / callback / email)  
5. Save **recording + transcript** for review  

**Alex** represents **Vantora** (workflow automation: follow-ups, reminders, data entry — free trial then paid plan in the pitch).

| Mode | Who uses it | Notes |
|------|-------------|--------|
| **Call Agent** | Recruiter / tester | Browser mic; best for demos |
| **Outbound Dialer** | Real phone | Free number = US + daily cap |
| **Call History** | Anyone | Play / seek / delete recordings |

---

## 5. What works today (shipped features)

| Feature | Status | Notes |
|---------|--------|--------|
| Live site on Vercel | ✅ | https://web-rouge-xi-23.vercel.app |
| Call Agent (web voice) | ✅ | Louder live playback boost; Elliot voice @ **0.8** speed |
| English / Urdu (choose **before** call) | ✅ | Mid-call live switch **locked for now** (roadmap §13) |
| Language lock scripts | ✅ | Wrong language → one lock line, then resume locked language |
| Idle presence (client-managed on web) | ✅ | ~5s → check → ~5s → check → ~5s → polite end (EN/UR match call language) |
| Hangup / “call cut” | ✅ | Roman + Urdu-script detection; **Allah hafiz / goodbye → hard cut ~2s after** |
| Callback ≠ hangup | ✅ | “call kr do / call me back” books callback; does **not** end the call |
| Soft barge-in | ✅ | Needs several real words before Alex stops mid-line (avoids half-salam cuts) |
| Outbound dialer | ✅ | US `+1` on free number (daily cap applies) |
| Call History | ✅ | Only calls **with recordings**; paginated past deleted stubs |
| Recording play + seek (±10s) | ✅ | Blob load + range proxy |
| Transcripts | ✅ | Per call detail |
| Delete call | ✅ | VAPI delete + cookie hide so refresh doesn’t bring it back |
| Objection playbook | ✅ | `prompts/objections.md` |
| Groq via VAPI | ✅ | `llama-3.3-70b-versatile` · short `maxTokens` for snappy replies |
| Dark responsive UI | ✅ | Phones / tablets / desktop |
| Favicon / branding | ✅ | Vantora |
| Autopilot (auto leads + auto dial) | 🔜 | Designed in §14 — not fully coded yet |

### Assessment completeness (honest)

| Area | Status |
|------|--------|
| Web Call Agent + EN/Urdu + history + recordings | Done — primary eval path |
| Hangup after goodbye / “call cut” | Shipped — re-test after hard refresh |
| Outbound full E2E on free VAPI number | **Pending** daily quota / re-test after reset or imported number |
| Live mid-call language switch + inbound IVR | Roadmap only (§13) |
| Callback scheduler / Excel / dashboard / autopilot | Roadmap only (§13–14) |

---

## 6. Architecture (step by step)

### Step-by-step call flow (Call Agent)

1. User opens live site → selects language → **Call Agent**  
2. Browser loads `@vapi-ai/web` with public key  
3. `vapi.start(assistantId, overrides)` applies EN/Urdu prompt, voice, STT  
4. Mic audio → **Deepgram** STT → **Groq** LLM → **Elliot** TTS → speaker (volume boosted in browser)  
5. Call ends → VAPI stores recording + transcript  
6. UI lists call via `GET /api/calls` → detail plays via `/api/calls/[id]/recording`

### Step-by-step outbound flow

1. User enters `+1…` in Outbound Dialer  
2. `POST /api/outbound` → VAPI `/call` with `phoneNumberId` + `assistantId`  
3. Free US number dials prospect (if daily limit allows)  
4. Same agent pipeline on the phone  
5. Recording appears in Call History when artifacts exist  

### Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Live Web App — Vercel                                           │
│  Call Agent · Outbound Dialer · Call History · Call Detail       │
└───────────────┬─────────────────────────────┬───────────────────┘
                │ @vapi-ai/web                │ Next.js /api/*
                ▼                             ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ VAPI Web Session             │   │ API: calls, outbound,        │
│ Deepgram → Groq → Elliot     │   │ recording proxy, webhook     │
└──────────────────────────────┘   └──────────────┬───────────────┘
                                                  │
                                                  ▼
                                   ┌──────────────────────────────┐
                                   │ VAPI Cloud                    │
                                   │ Assistants · Calls · Storage  │
                                   │ Free US Phone Number          │
                                   └──────────────────────────────┘
```

### Data ownership

| Data | Where |
|------|--------|
| Prompts / personality | `prompts/` → pushed with `scripts/deploy-assistant.js` |
| Voice / model / recording flags | `config/assistant-config.json` |
| Call audio + transcripts | **VAPI cloud** |
| Hidden deleted IDs | Browser cookie `vantora_hidden_calls` (so refresh stays clean) |
| Web UI | `web/` on **Vercel** |
| Secrets | Root `.env` + Vercel Environment Variables |

---

## 7. Project map — which file does what

### Root

| Path | Responsibility |
|------|----------------|
| `README.md` | This documentation |
| `.env` / `.env.example` | API keys (never commit real secrets) |
| `package.json` | `dev`, `deploy:assistant`, `sync:web-env`, `add:groq` |
| `config/assistant-config.json` | Default VAPI assistant: voice, model, recording, timeouts |
| `prompts/system-prompt.md` | English base personality + pitch + flow |
| `prompts/objections.md` | Objection → reply playbook |
| `scripts/deploy-assistant.js` | Push prompts + config to VAPI |
| `scripts/add-groq-credential.js` | Attach Groq key to VAPI |
| `scripts/sync-web-env.js` | Root `.env` → `web/.env.local` |
| `scripts/run-dev.cmd` | Windows: free port + Next + Chrome |
| `.vscode/*` | IDE Node path + launch |

### Web pages (`web/app/`)

| Path | Responsibility |
|------|----------------|
| `layout.tsx` | Shell, nav, fonts, viewport, favicon |
| `page.tsx` | Home: hero + Call Agent + Outbound + History |
| `globals.css` | Theme, responsive layout, tap-highlight off |
| `calls/page.tsx` | Full Call History page |
| `calls/[id]/page.tsx` | Single call detail route |
| `icon.svg` | Favicon |

### UI components (`web/components/`)

| Path | Responsibility |
|------|----------------|
| `TalkToAgent.tsx` | Call Agent, EN/Urdu lock, idle, hangup timers, live volume boost, transcript |
| `OutboundDialer.tsx` | Place real outbound call |
| `CallHistory.tsx` | List + delete |
| `CallDetail.tsx` | Meta, player, transcript, delete |
| `AmplifiedPlayer.tsx` | Recording play / seek / loudness |

### API (`web/app/api/`)

| Path | Responsibility |
|------|----------------|
| `calls/route.ts` | List calls (recording-only; hide deleted / cookie-hidden) |
| `calls/[id]/route.ts` | Get one call · DELETE (+ Set-Cookie hide) |
| `calls/[id]/recording/route.ts` | Proxy audio for play + seek |
| `outbound/route.ts` | Start outbound VAPI call |
| `webhook/route.ts` | VAPI event receiver |

### Libs / hooks

| Path | Responsibility |
|------|----------------|
| `web/lib/vapi.ts` | Types, labels, history filters, cookie helpers, `vapiFetch` |
| `web/lib/speechConfig.ts` | STT (Deepgram), voice speed, idle lines, hangup/goodbye detectors, end-call phrases, turn-taking |
| `web/lib/englishSystemPrompt.ts` | English Call Agent system prompt (web overrides) |
| `web/lib/urduSystemPrompt.ts` | Roman Urdu system prompt + callback-vs-cut rules |
| `web/lib/languageLock.ts` | EN/UR lock one-liners when user speaks the wrong language |
| `web/lib/callErrors.ts` | Friendly error strings for UI |
| `web/scripts/patch-assistant-efficient.js` | Patch base VAPI assistant (e.g. clear server idle hooks for web) |
| `web/hooks/useAutoDismiss.ts` | Auto-clear UI messages (~5s) |
| `web/app/icon.svg` | **Favicon / browser tab icon** (Vantora V + voice-wave) — Next.js serves this automatically |

### Change X → edit Y

| Want to change | Edit | Then |
|----------------|------|------|
| English pitch / personality (base) | `prompts/system-prompt.md` | `npm run deploy:assistant` |
| English Call Agent prompt (web) | `web/lib/englishSystemPrompt.ts` | redeploy web |
| Objections | `prompts/objections.md` | deploy assistant |
| Default voice/model/recording | `config/assistant-config.json` | deploy assistant |
| Urdu wording / cut vs callback | `web/lib/urduSystemPrompt.ts` | redeploy web |
| Hangup phrases / idle lines / STT | `web/lib/speechConfig.ts` | redeploy web |
| Call Agent / volume / hangup timers | `TalkToAgent.tsx` | redeploy web |
| History filters | `web/lib/vapi.ts` + `api/calls` | redeploy web |
| Theme / responsive | `globals.css` | redeploy web |

---

## 8. Language switching (English / Urdu)

| Control | Behavior **today** |
|---------|------------------|
| Before call (web) | User picks **English** or **Urdu**, then starts Call Agent — language is **locked for that call** |
| During call (web) | Language buttons are **disabled** — mid-call live switch is **not available** right now |
| Outbound / inbound | No live language switch yet (English assistant default on phone unless configured otherwise) |
| English mode | Speaks and understands English only (language lock) |
| Urdu mode | Speaks and understands Urdu (replies in easy Roman Urdu on screen) |

**Future:** full live language switching for **web + inbound + outbound** (digit IVR at start + mid-call digit switch, plus efficient web switch) — see **§13**.

Files: `TalkToAgent.tsx`, `urduSystemPrompt.ts`, `speechConfig.ts`, base rules in `prompts/system-prompt.md`.

---

## 9. Call History rules (what appears)

| Appears in history? | Condition |
|---------------------|-----------|
| Yes | Call has a **saved recording** artifact |
| No | Soft-deleted (`call-deleted`) or user Delete (cookie hide) |
| No | Failed outbound / daily-limit / error (usually no recording) |
| Yes (often) | Alex spoke, user hung up without talking — if VAPI still saved audio |

Labels: **Web demo N** or **Outbound** (phone), never raw `outboundPhoneCall` on browser demos.

---

## 10. Setup guide (step by step)

### Accounts

| # | Platform | Cost | Link |
|---|----------|------|------|
| 1 | VAPI | ~$10 one-time credits | https://dashboard.vapi.ai |
| 2 | Groq | Free | https://console.groq.com/keys |
| 3 | Vercel | Free Hobby | https://vercel.com |

### Steps already done for this project

1. VAPI account + assistant  
2. Groq key → `npm run add:groq`  
3. Deploy assistant → `npm run deploy:assistant`  
4. Free US phone number → `VAPI_PHONE_NUMBER_ID`  
5. Next.js web app + Vercel env + prod deploy  
6. README + live link  

### Env vars

```env
VAPI_API_KEY=
VAPI_PUBLIC_KEY=
VAPI_ASSISTANT_ID=
VAPI_PHONE_NUMBER_ID=
GROQ_API_KEY=
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_VAPI_ASSISTANT_ID=
```

Sync local web: `npm run sync:web-env`

### Local run (Windows)

```powershell
cd "C:\Users\CodeTech\Desktop\Cold-Calling AI Voice Agent"
.\scripts\run-dev.cmd
```

Or `npm run dev` — picks a free port from 3000 and opens Chrome.

---

## 11. Configuration & customization

| Change | File | Command |
|--------|------|---------|
| Pitch / product | `prompts/system-prompt.md` | `npm run deploy:assistant` |
| Objections | `prompts/objections.md` | `npm run deploy:assistant` |
| Voice / model / timeouts | `config/assistant-config.json` | `npm run deploy:assistant` |
| Web UI / APIs | `web/**` | `cd web` → `npx vercel --prod --yes` |
| Secrets | `.env` + Vercel env | Redeploy web after `NEXT_PUBLIC_*` changes |

Default stack: Groq `llama-3.3-70b-versatile` · VAPI voice **Elliot** · recording **ON**.

---

## 12. Deployment

| Component | Platform | URL / place |
|-----------|----------|-------------|
| Web demo | Vercel | https://web-rouge-xi-23.vercel.app |
| Assistant | VAPI | Dashboard → Assistants |
| Phone | VAPI Free Telephony | Dashboard → Phone Numbers |

```powershell
npm run deploy:assistant
cd web
npx vercel --prod --yes
```

---

## 13. Improvements & how advanced it can get

> These are **future upgrades** (not all built yet). The live demo already does Call Agent, outbound, recordings, EN/Urdu, idle, hangup. Below is how far this product can go — including **efficiency techniques** and **near 100% hands-off automation**.

### Already shipped (today)

- Live Call Agent + Outbound dialer + Call History + recordings
- English / Urdu · delete · friendly errors · louder live voice · Elliot @ **0.8** speed
- **Language before call (web):** user chooses **English or Urdu**, then starts — that language stays **locked for the whole call**. Mid-call live switch is **intentionally disabled** for now (see roadmap below).
- **Language lock script** on web / outbound / inbound (once language is set): wrong language → English: `Sorry, I can speak and understand only English.` · Urdu: `Mazrat, main sirf Urdu hi bolta aur samajhta hoon.` (then resume when they use the locked language)
- **Idle presence (5s → 5s → end):** client-managed on web so Urdu never hears English “Are you there?”; phone/outbound can still use VAPI hooks when not client-managed
- **Hangup reliability:** “call cut / call kt / کال کٹ …” → short bye → **hard stop ~2s after Allah hafiz / goodbye** (client timer + `end-call` / `stop`, not only LLM hope)
- **Callback ≠ cut:** “call kr do / call me back” books a time; does not hang up
- Soft barge-in (`stopSpeakingPlan`) so ambient noise doesn’t chop Assalam mid-line
- **Delete** removes the call from the site **and** permanently deletes it on VAPI (recording included)

### Nothing critical left for the assessment demo?

For **Likva9 eval via Call Agent**, the core loop is done. Remaining gaps are either **ops limits** or **roadmap product**:

| Still open | Why it isn’t a blocker for web demo |
|------------|-------------------------------------|
| Outbound E2E on free VAPI number | Daily ~10-attempt cap (re-test after reset / import Twilio etc.) |
| Mid-call live language switch | Intentionally locked; design is in this section |
| Callback auto-dial / Excel / dashboard | Product roadmap — agent can *agree* verbally but no scheduler yet |
| GitHub remote | ✅ Done — https://github.com/rohaan2802/Cold-Calling-Agent |

### Efficiency techniques (latency · cost · reliability)

Ways to make Alex **faster, cheaper, and more stable** without changing the product story:

| Technique | Why it helps | Effort |
|-----------|--------------|--------|
| Keep **short `maxTokens`** (already ~110) + tight prompts | Fewer tokens = lower Groq/VAPI cost + snappier TTS | Low |
| Prefer **one STT language per call** (already locked) | Multi-language STT is slower / noisier; dedicated `en` / `ur` is cleaner | Done |
| Tune **endpointing** (Deepgram 300ms + start/stop speaking plans) | Fewer false barge-ins and fewer “I didn’t hear you” loops | Done / tweak |
| **Client hangup hard-stop** after goodbye (already) | Don’t rely only on LLM `endCall` — STT miss / tool miss still cuts the line | Done |
| Unit-test **hangup / goodbye detectors** (`isUserHangupRequest`, `isAssistantGoodbye`) | Catch STT spelling variants (“all kt”, Arabic script) before prod breaks again | Low |
| **Webhook → own DB** (Postgres / SQLite) instead of only listing VAPI calls | Faster history, outcome labels, no pagination fights with `call-deleted` stubs | Medium |
| **Outcome classifier** post-call (interested / callback / DNC) via one cheap LLM pass | Dashboard + sheet sync without listening to every recording | Medium |
| Optional **cheaper model** for simple turns; keep 70B for objections | Cut LLM spend on “haan / theek hai” acknowledgements | Medium |
| **Prompt / FAQ RAG** over product docs | Shorter system prompt + accurate answers → less hallucination, fewer tokens | Medium |
| **Recording retention policy** (auto-delete after N days) | Lower storage / privacy risk | Low–Med |
| Import **Twilio/Telnyx** + quiet-hours dialer | Real outbound scale; free VAPI number stays demo-only | Medium |
| **Parallel dial / queue** with concurrency caps | More connects per hour once telephony is paid | High |
| Pre-warm VAPI session / measure **time-to-first-audio** | Demo feel = “human speed”; track p50/p95 | Medium |
| CI on GitHub (lint + typecheck + hangup unit tests) | Safer deploys; fewer “forgot to redeploy web” mistakes | Low |

### Callback reminders — not built yet

We have **not** implemented automatic callback reminders yet. The agent can *agree* to call back in conversation, but there is no scheduler that dials again at a set time. That belongs in the improvements below.

### Planned improvements (product roadmap)

| Idea | What it would do |
|------|------------------|
| **Live language switching (web + inbound + outbound)** | Keep the option for all three call types: choose language **at call start** and **switch mid-call**. See detailed design below. **Not enabled in the live demo right now.** |
| **Inbound language picker (EN / Urdu)** | When someone **calls in**, Alex first offers a choice (spoken + digit dial) — then locks that language. **Not built yet.** |
| **Callback reminders** | If prospect says "call me at 5pm / kal", AI schedules reminder + auto-dials at that time |
| **Auto-discard not interested** | Outcome = not interested / DNC → drop from active queue (keep archive for compliance) |
| **Excel / CSV upload button** | Upload lead sheet → save → AI works that list |
| **AI updates the sheet** | After each call, mark rows: Interested / Not / Callback / Email / Wrong number |
| **Progress dashboard** | Totals: leads, called, remaining, interested %, callbacks due, calls by hour, agent progress |
| **Client intake** | Website form / WhatsApp / email → leads enter queue automatically |
| **Agent shares company details** | Tools: SMS/email with pricing, calendar link, brochure — without a human on the line |
| **Hangup edge-case hardening** | More STT misspellings, dual-channel endCall + client stop, optional “End call” UI button during web demo |
| **Own call DB + analytics** | Store outcomes, talk-time, connect rate — don’t only depend on VAPI list API |
| **Full autopilot loop** | Dial → talk → log → remind → re-dial → nurture → book demo |

#### Live language switching — full design (future)

Apply the same pattern to **web Call Agent**, **inbound phone**, and **outbound phone**:

**1) At call start (phone IVR style)**  
- Agent greets and offers language by **pressing a digit**, the way normal phone menus work (example: *“For English, press 1. Urdu ke liye 2 dabayein.”* — English line in English, Urdu line in Urdu).  
- After the digit, lock STT + replies to that language for the call.  
- Also tell the caller: *during the call you can switch language by pressing a specific digit* (example: *“Anytime, press 9 to switch language.”*).

**2) Mid-call switch (phone)**  
- User presses the announced digit → language switches **live** (prompt + speech recognition) without hanging up.  
- Agent confirms briefly in the **new** language, then continues the sales conversation.

**3) Mid-call switch (web)**  
- Same idea via UI (English / Urdu buttons) — must be **reliable**: if the user switches while Alex is talking, Alex should cut over and continue in the new language; transcript/STT must match the new language (no wrong-script / wrong-language replies).

**4) Quiet / timing edge cases (all channels)**  
- If **both are quiet** and the user switches → Alex should speak soon in the **switched** language (short confirm, then continue).  
- If the **user is speaking** and Alex is quiet, and the user switches → Alex should respond **immediately**, naming the switched language, e.g. English: *“I understand only English.”* / Urdu: *“Main sirf Urdu hi samajhta aur bolta hoon.”* (then continue in that language).

**Status today:** web allows language **only before start**; mid-call web switch is **locked off**. Inbound/outbound live switch + digit IVR are **not implemented** yet.

### Level A — polish (easy)

- **Live language switching** (web + inbound + outbound) per §13 design — digit IVR at start, mid-call digit / UI switch, quiet-edge confirms
- **Inbound IVR language menu** (English prompt in English + Urdu prompt in Urdu → lock agent language for that call)
- Stronger outcome labels (booked / callback / lost / not interested)
- CSV / Excel **export** of call history
- Unit tests for hangup / goodbye phrase detectors
- Optional on-screen **End call** button (web) as backup to voice “call cut”
- More TTS voices / A/B openings
- Homepage "How to test" 3-step box
- GitHub repo + CI (lint / typecheck)

### Level B — sales ops (medium)

- **Callback reminder engine** (cron + timezone + quiet hours)
- **Excel/CSV upload UI** + editable lead table
- **AI sheet sync** (interested / not / callback columns)
- **Analytics dashboard** (funnel, connect rate, talk time, outcomes)
- Webhook → own DB (faster history, no deleted-stub pagination pain)
- Calendar booking (Cal.com / Google)
- Email / SMS follow-up tools
- Warm transfer to human only when requested
- Cheaper model path for short acknowledgements

### Level C — enterprise / near–no human (advanced)

- Parallel dialing + smart queue
- Lead discovery APIs with consent rules
- Brand voice cloning + RAG over product docs
- Compliance (DNC, quiet hours, recording consent + retention)
- Multi-tenant SaaS (many clients, each with agent + dashboard)
- Slack / email digests: "today 40 calls, 6 interested, 3 demos booked"

**Ceiling:** sheet in → AI dials → updates sheet → reminders → books meetings → reports — humans mostly set rules and top up credits.

---

## 14. Full automation vision (autopilot — without constant human intervention)

**Goal:** Keep the app live-deployed; the system works leads, calls, logs, reminds, and surfaces **qualified clients** — you mostly keep hosting + credits + policies.

### Target loop

```
Client / lead intake (form, Excel upload, CRM, WhatsApp)
        → Lead DB (pending / calling / interested / not / callback / DNC)
        → Scheduler (Vercel Cron) — calling hours + callback times
        → Outbound API (existing /api/outbound)
        → Alex talks (EN/Urdu) + tools (email, SMS, calendar)
        → Webhook writes outcome back to sheet/DB
        → Dashboard updates live
        → Callbacks auto-fire later
        → Interested leads → notify owner + book demo
```

### How new clients / prospects can contact (suggested)

| Channel | Flow |
|---------|------|
| Website Call Agent | Already live for demos |
| "Request a call" form | Name, phone, company → queue |
| Excel upload (sales team) | Bulk B2B lists |
| Inbound call to VAPI number | Same agent answers inbound |
| WhatsApp / email webhook | Parse → create lead |

### How the agent can give your details (suggested tools)

- Email tool: pricing + calendar link
- SMS tool: short follow-up with booking URL
- Speak aloud: company name, offer, next step
- Post-call summary to **your** inbox for interested leads only

### What stays human (honest)

| Humans still do | System does alone |
|-----------------|-------------------|
| Keep Vercel + keys live | Dial queue + callbacks |
| Top up VAPI credits | Talk, record, label outcomes |
| Set DNC / quiet hours / caps | Update Excel/DB + dashboard |
| Close high-value deals | Notify you of interested / booked demos |

**When to build:** after assessment acceptance, with credits + lawful leads + compliance.  
**Free-tier honesty:** free VAPI number still has daily outbound caps + US-only until Twilio/Telnyx/Vonage.

---

## 15. Testing checklist

- [x] Live demo loads  
- [x] Call Agent + first message  
- [x] English / Urdu (**before** call only; mid-call switch locked)  
- [x] Objections  
- [x] Idle presence in correct language (EN / UR)  
- [x] Hangup: “call cut kr do” / goodbye → cut ~2s after Allah hafiz  
- [x] Callback phrase does **not** hang up (“call kr do” / “call me back”)  
- [x] History + recording play + delete  
- [x] Language lock script (EN lock in English; UR lock in Roman Urdu; then resume locked language)  
- [ ] **Outbound US end-to-end** — **not completed** in this window due to **VAPI free-number daily outbound limit** (re-test after reset or imported Twilio/Telnyx/Vonage)  
- [ ] Live language switching web + inbound + outbound (planned — see §13)  
- [ ] Inbound language picker / digit IVR (planned — see §13)  

---

## 16. Troubleshooting

| Problem | Fix |
|---------|-----|
| Outbound "daily limit" | Wait for next day reset, or import Twilio/Telnyx/Vonage |
| International dial fails | Free number = **US only** (`+1`) |
| Credits gone / calls fail | VAPI wallet one-time — top up (credits do **not** renew daily) |
| Recording missing | Wait 30–60s, refresh; only recorded calls list |
| Deleted call returns | Hard refresh; delete cookie + filter `call-deleted` |
| Soft Alex voice | Live boost in `TalkToAgent`; raise device volume |
| “Call cut” doesn’t hang up | Hard refresh live site; say clearly “call cut kr do”; client must detect hangup (see `speechConfig.ts`) |
| Stays open after Allah hafiz | Should hard-stop ~2s after goodbye; if not, hard refresh — check `TalkToAgent` hangup timers |
| English “Are you there?” on Urdu call | Web uses client-managed idle; patch base assistant hooks empty (`patch-assistant-efficient.js`) |
| Node not found in Cursor | Use `scripts/run-dev.cmd` / `.vscode` Node path |
| Favicon / icon | Source file: `web/app/icon.svg` (browser tab icon) |

---

## 17. Submission

| | |
|---|---|
| **Live** | https://web-rouge-xi-23.vercel.app |
| **GitHub** | https://github.com/rohaan2802/Cold-Calling-Agent |
| **Platforms** | [VAPI](https://vapi.ai) · [Groq](https://groq.com) · [Deepgram](https://deepgram.com) · [Next.js](https://nextjs.org) · [Vercel](https://vercel.com) |
| **Email** | contact@likva9.tech |
| **Deadline** | 25 August 2026 |

Suggested note: Call Agent for eval · Call History for recordings · README covers callbacks, Excel, dashboard, efficiency techniques, and hands-off automation path.

---

## 18. Changelog

| Date | Change |
|------|--------|
| 2026-08-20 | Project init — VAPI + Groq + Vercel |
| 2026-08-20 | Call Agent, outbound, history, recordings, delete |
| 2026-08-20 | Vantora brand, EN/Urdu, responsive UI |
| 2026-08-20 | Urdu nova-3 STT, louder live voice, seekable player |
| 2026-08-20 | History = recordings only; delete cookie hide |
| 2026-08-20 | README: credits one-time not daily, architecture, platforms, autopilot |
| 2026-08-21 | README: callbacks, Excel upload, discard, dashboard, client intake, hands-off automation; icon path documented |
| 2026-08-21+ | Language lock before/during call; client-managed idle; soft barge-in; voice speed 0.8 |
| 2026-08-23 | Hangup: Urdu “call cut” + Allah hafiz → hard cut ~2s; README §5/§7/§13 efficiency + completeness |
| 2026-08-23 | Public GitHub: https://github.com/rohaan2802/Cold-Calling-Agent |

---

## 19. GitHub (source)

| | |
|---|---|
| **Repo** | https://github.com/rohaan2802/Cold-Calling-Agent |
| **Visibility** | Public |
| **Branch** | `main` |
| **Secrets** | `.env` / real keys are **not** in the repo (see `.gitignore` + `.env.example`) |

Clone:

```bash
git clone https://github.com/rohaan2802/Cold-Calling-Agent.git
cd Cold-Calling-Agent
cp .env.example .env   # fill keys
npm run sync:web-env
cd web && npm install && npm run dev
```

---

## Folder tree (source)

```
Cold-Calling AI Voice Agent/
├── README.md
├── .env.example
├── package.json
├── config/assistant-config.json
├── prompts/system-prompt.md
├── prompts/objections.md
├── scripts/
│   ├── deploy-assistant.js
│   ├── add-groq-credential.js
│   ├── sync-web-env.js
│   └── run-dev.cmd
└── web/
    ├── app/
    │   ├── icon.svg          ← browser favicon
    │   ├── page.tsx
    │   ├── layout.tsx
    │   └── api/…
    ├── components/
    ├── lib/
    │   ├── speechConfig.ts   ← STT, idle, hangup detectors
    │   ├── englishSystemPrompt.ts
    │   ├── urduSystemPrompt.ts
    │   └── …
    └── hooks/
```

---

_Built by Rohaan — Likva9 Technical Assessment_
