import { NextResponse } from "next/server";
import {
  buildHiddenCallsCookie,
  hasRecording,
  isDeletedCall,
  parseHiddenCallIds,
  vapiFetch,
} from "@/lib/vapi";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const hidden = parseHiddenCallIds(req.headers.get("cookie"));
    if (hidden.has(id)) {
      return NextResponse.json(
        { error: "This call was deleted." },
        { status: 404 }
      );
    }

    const res = await vapiFetch(`/call/${id}`);
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Call not found" },
        { status: res.status }
      );
    }

    if (isDeletedCall(data)) {
      return NextResponse.json(
        { error: "This call was deleted. Recording and transcript are no longer available." },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Permanently delete the call on VAPI (removes recording artifacts) + hide in our UI cookie.
 */
export async function DELETE(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const hidden = parseHiddenCallIds(req.headers.get("cookie"));
    const cookie = buildHiddenCallsCookie(hidden, id);

    let lastError = "";
    let deletedOnVapi = false;

    // Retry VAPI hard delete — recordings live on VAPI until the call is deleted there
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await vapiFetch(`/call/${id}`, { method: "DELETE" });
      if (res.ok) {
        deletedOnVapi = true;
        break;
      }
      try {
        const data = await res.json();
        lastError = String(data?.message || data?.error || `HTTP ${res.status}`);
      } catch {
        lastError = `HTTP ${res.status}`;
      }
      // 404 = already gone on VAPI
      if (res.status === 404) {
        deletedOnVapi = true;
        break;
      }
    }

    // Verify recording is gone / call marked deleted
    if (deletedOnVapi) {
      try {
        const check = await vapiFetch(`/call/${id}`);
        if (check.ok) {
          const data = await check.json();
          if (!isDeletedCall(data) && hasRecording(data)) {
            // One more delete pass
            await vapiFetch(`/call/${id}`, { method: "DELETE" });
          }
        }
      } catch {
        /* ignore verify errors */
      }
    }

    if (!deletedOnVapi) {
      // Still hide in UI, but tell client VAPI delete failed
      return NextResponse.json(
        {
          ok: false,
          id,
          error:
            lastError ||
            "Could not permanently delete this call on VAPI. It is hidden here — try Delete again.",
        },
        {
          status: 502,
          headers: { "Set-Cookie": cookie },
        }
      );
    }

    return NextResponse.json(
      { ok: true, id, deletedOnVapi: true },
      { headers: { "Set-Cookie": cookie } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
