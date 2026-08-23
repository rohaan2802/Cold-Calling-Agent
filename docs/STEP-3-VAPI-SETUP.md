# Step 3 — VAPI Assistant Setup

Complete these sub-steps in order.

---

## 3A — Add Groq key to VAPI (one-time)

VAPI uses your Groq account for the AI brain.

1. Open [VAPI Dashboard](https://dashboard.vapi.ai)
2. Go to **Organization Settings** → **Provider Keys** (or **Credentials**)
3. Find **Groq** → click **Add Key**
4. Paste your Groq API key → **Save**

---

## 3B — Get VAPI API key

1. In VAPI Dashboard → **API Keys** (left sidebar)
2. Copy your **Private Key** (starts with something like a long token)
3. Also copy **Public Key** (needed later for web widget)

---

## 3C — Create `.env` file

In the project root, copy the example:

```powershell
copy .env.example .env
```

Open `.env` and fill in:

```env
VAPI_API_KEY=your_private_key_here
VAPI_PUBLIC_KEY=your_public_key_here
GROQ_API_KEY=your_groq_key_here
```

> Keep `.env` private — never commit or share it.

---

## 3D — Deploy the assistant

Run from project folder:

```powershell
npm run deploy:assistant
```

Expected output:

```
✅ Assistant deployed successfully!
   Name:        FlowSync Cold-Call Agent
   ID:          xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Recording:   ON
   Transcript:  ON
```

The script saves `VAPI_ASSISTANT_ID` into `.env` automatically.

---

## 3E — Quick test in VAPI Dashboard

1. Dashboard → **Assistants** → **FlowSync Cold-Call Agent**
2. Click **Talk to Assistant** (browser mic test — free, no phone credits)
3. Try saying: *"I'm not interested"* — agent should handle objection
4. Try: *"Send me an email"* — agent should collect email

---

## What was configured

| Setting | Value |
|---------|-------|
| Agent name | Alex (FlowSync sales rep) |
| AI model | Groq Llama 3.3 70B (free via your key) |
| Voice | VAPI Elliot v2 (built-in, low cost) |
| Recording | ON — saved after every call |
| Transcript | ON — full conversation text |
| First message | Agent speaks first (cold-call style) |
| Max call length | 5 minutes |
| Objections | 10+ handled in system prompt |

---

## Change script or product later

| Want to change | Edit this file | Then run |
|----------------|----------------|----------|
| Sales pitch / personality | `prompts/system-prompt.md` | `npm run deploy:assistant` |
| Objection responses | `prompts/objections.md` | `npm run deploy:assistant` |
| Voice / model / recording | `config/assistant-config.json` | `npm run deploy:assistant` |
| Product name & facts | `prompts/system-prompt.md` (Product facts table) | `npm run deploy:assistant` |

No dashboard changes needed — edit file → redeploy → live instantly.
