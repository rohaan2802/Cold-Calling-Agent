/**
 * Adds your Groq API key to VAPI (dashboard Integrations often has no Groq field).
 *
 * Usage:
 *   node scripts/add-groq-credential.js
 *
 * Requires .env:
 *   VAPI_API_KEY=...   (VAPI Private Key)
 *   GROQ_API_KEY=...   (from console.groq.com/keys)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("\n.env not found. Copy .env.example to .env first.\n");
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

async function main() {
  const env = loadEnv();
  const vapiKey = env.VAPI_API_KEY;
  const groqKey = env.GROQ_API_KEY;

  if (!vapiKey || vapiKey.includes("your_vapi")) {
    console.error("\nSet VAPI_API_KEY in .env (VAPI Dashboard → API Keys → Private Key).\n");
    process.exit(1);
  }

  if (!groqKey || groqKey.includes("your_groq") || !groqKey.startsWith("gsk_")) {
    console.error("\nSet GROQ_API_KEY in .env (must start with gsk_).\n");
    process.exit(1);
  }

  console.log("\nAdding Groq credential to VAPI...\n");

  const res = await fetch("https://api.vapi.ai/credential", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vapiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "groq",
      apiKey: groqKey,
      name: "Groq (student BYOK)",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("VAPI error:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("Groq connected to VAPI.");
  console.log("Credential id:", data.id);
  console.log("\nNext: wait for the next step in chat.\n");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
