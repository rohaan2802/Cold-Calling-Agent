import { NextResponse } from "next/server";
import { isDeletedCall, vapiFetch } from "@/lib/vapi";

type Params = { params: Promise<{ id: string }> };

/**
 * Stream recording bytes ASAP — avoid double VAPI round-trips and full in-memory buffer when possible.
 */
export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const apiKey = process.env.VAPI_API_KEY;
    const range = req.headers.get("range");

    if (!apiKey) {
      return NextResponse.json({ error: "VAPI_API_KEY missing" }, { status: 500 });
    }

    const auth = { Authorization: `Bearer ${apiKey}` };

    // Fast path: mono-recording first (no extra /call meta fetch)
    const mono = await fetch(`https://api.vapi.ai/call/${id}/mono-recording`, {
      headers: {
        ...auth,
        ...(range ? { Range: range } : {}),
      },
      redirect: "follow",
      cache: "force-cache",
    });

    if (mono.ok) {
      const contentType = mono.headers.get("content-type") || "audio/mpeg";
      if (!contentType.includes("application/json") && mono.body) {
        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "private, max-age=600, stale-while-revalidate=120");
        const len = mono.headers.get("content-length");
        if (len) headers.set("Content-Length", len);
        const cr = mono.headers.get("content-range");
        if (cr) headers.set("Content-Range", cr);
        return new NextResponse(mono.body, {
          status: mono.status === 206 ? 206 : 200,
          headers,
        });
      }
    }

    // Fallback: call artifact URLs (one meta fetch)
    const callRes = await vapiFetch(`/call/${id}`);
    if (!callRes.ok) {
      return NextResponse.json({ error: "Call not found" }, { status: callRes.status });
    }
    const call = await callRes.json();
    if (isDeletedCall(call)) {
      return NextResponse.json(
        { error: "Recording deleted with this call." },
        { status: 404 }
      );
    }

    const candidates = [
      call?.artifact?.recording?.mono?.combinedUrl,
      call?.artifact?.recordingUrl,
      call?.artifact?.stereoRecordingUrl,
      call?.artifact?.recording?.stereoUrl,
      call?.artifact?.recording?.mono?.assistantUrl,
    ].filter((u): u is string => typeof u === "string" && u.length > 0);

    for (const url of candidates) {
      try {
        const fileRes = await fetch(url, {
          redirect: "follow",
          headers: range ? { Range: range } : undefined,
          cache: "force-cache",
        });
        if (!fileRes.ok || !fileRes.body) continue;
        const contentType = fileRes.headers.get("content-type") || "audio/mpeg";
        if (contentType.includes("xml") || contentType.includes("json")) continue;

        const headers = new Headers();
        headers.set("Content-Type", contentType);
        headers.set("Accept-Ranges", "bytes");
        headers.set("Cache-Control", "private, max-age=600, stale-while-revalidate=120");
        const len = fileRes.headers.get("content-length");
        if (len) headers.set("Content-Length", len);
        const cr = fileRes.headers.get("content-range");
        if (cr) headers.set("Content-Range", cr);
        return new NextResponse(fileRes.body, {
          status: fileRes.status === 206 ? 206 : 200,
          headers,
        });
      } catch {
        /* try next */
      }
    }

    return NextResponse.json(
      {
        error:
          "Recording not available yet. Wait 30–60s after the call ends, then refresh.",
      },
      { status: 404 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
