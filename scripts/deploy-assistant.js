/**
 * Deploy (create or update) the VAPI cold-calling assistant.
 *
 * Usage:
 *   node scripts/deploy-assistant.js
 *
 * Requires .env with:
 *   VAPI_API_KEY=...
 *   VAPI_ASSISTANT_ID=...  (optional — if set, updates existing assistant)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("\n❌ .env file not found.");
    console.error("   Copy .env.example to .env and add your VAPI_API_KEY.\n");
    process.exit(1);
  }

  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function buildSystemPrompt() {
  const systemPath = path.join(ROOT, "prompts", "system-prompt.md");
  const objectionsPath = path.join(ROOT, "prompts", "objections.md");

  let system = fs.readFileSync(systemPath, "utf8");
  const objections = fs.readFileSync(objectionsPath, "utf8");

  // Strip markdown title lines for cleaner prompt
  system = system.replace(/^# .+\n\n/m, "");
  const objectionsBody = objections.replace(/^# .+\n\n/m, "");

  return system.replace("{{OBJECTIONS}}", objectionsBody);
}

function buildPayload(config, systemPrompt) {
  return {
    ...config,
    model: {
      ...config.model,
      messages: [{ role: "system", content: systemPrompt }],
    },
  };
}

async function saveAssistantId(id) {
  const envPath = path.join(ROOT, ".env");
  let content = fs.readFileSync(envPath, "utf8");

  if (/^VAPI_ASSISTANT_ID=/m.test(content)) {
    content = content.replace(/^VAPI_ASSISTANT_ID=.*/m, `VAPI_ASSISTANT_ID=${id}`);
  } else {
    content += `\nVAPI_ASSISTANT_ID=${id}\n`;
  }

  fs.writeFileSync(envPath, content);
}

async function main() {
  const env = loadEnv();
  const apiKey = env.VAPI_API_KEY;
  const assistantId = env.VAPI_ASSISTANT_ID;

  if (!apiKey || apiKey.includes("your_vapi")) {
    console.error("\n❌ Set VAPI_API_KEY in .env (from VAPI Dashboard → API Keys).\n");
    process.exit(1);
  }

  const configPath = path.join(ROOT, "config", "assistant-config.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const systemPrompt = buildSystemPrompt();
  const payload = buildPayload(config, systemPrompt);

  const isUpdate = assistantId && !assistantId.includes("your_assistant");
  const url = isUpdate
    ? `https://api.vapi.ai/assistant/${assistantId}`
    : "https://api.vapi.ai/assistant";
  const method = isUpdate ? "PATCH" : "POST";

  console.log(`\n🚀 ${isUpdate ? "Updating" : "Creating"} VAPI assistant...\n`);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("❌ VAPI API error:", JSON.stringify(data, null, 2));
    console.error("\nTips:");
    console.error("  • Add Groq API key in VAPI Dashboard → Provider Keys");
    console.error("  • Check VAPI_API_KEY is your Private Key\n");
    process.exit(1);
  }

  if (!isUpdate && data.id) {
    await saveAssistantId(data.id);
  }

  console.log("✅ Assistant deployed successfully!\n");
  console.log(`   Name:        ${data.name}`);
  console.log(`   ID:          ${data.id}`);
  console.log(`   Recording:   ${data.artifactPlan?.recordingEnabled ? "ON" : "OFF"}`);
  console.log(`   Transcript:  ${data.artifactPlan?.transcriptPlan?.enabled ? "ON" : "OFF"}`);
  console.log(`   Model:       ${data.model?.provider} / ${data.model?.model}`);
  console.log(`   Voice:       ${data.voice?.provider} / ${data.voice?.voiceId}`);
  console.log("\n   Saved VAPI_ASSISTANT_ID to .env");
  console.log("\n   Next: Test in VAPI Dashboard → Assistants → Talk to Assistant\n");
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err.message);
  process.exit(1);
});
