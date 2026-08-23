import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * Receives VAPI end-of-call-report webhooks and appends to local JSON log.
 * After Vercel deploy, set this URL as assistant serverUrl.
 */
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const message = payload?.message || payload;

    if (message?.type && message.type !== "end-of-call-report") {
      return NextResponse.json({ ok: true, ignored: message.type });
    }

    const call = message?.call || {};
    const artifact = message?.artifact || call?.artifact || {};

    const record = {
      savedAt: new Date().toISOString(),
      callId: call?.id,
      type: call?.type,
      status: call?.status,
      endedReason: message?.endedReason || call?.endedReason,
      customerNumber: call?.customer?.number,
      startedAt: call?.startedAt,
      endedAt: call?.endedAt,
      transcript: artifact?.transcript || call?.transcript || "",
      recording: artifact?.recording || artifact?.recordingUrl || null,
      summary: call?.analysis?.summary || call?.summary || null,
    };

    // Persist only on local/server filesystem when available
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const file = path.join(dataDir, "call-log.json");
      const existing = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8"))
        : [];
      existing.unshift(record);
      fs.writeFileSync(file, JSON.stringify(existing.slice(0, 200), null, 2));
    } catch {
      // Vercel serverless may be read-only — VAPI API remains source of truth
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
