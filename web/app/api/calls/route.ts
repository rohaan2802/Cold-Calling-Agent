import { NextResponse } from "next/server";
import {
  parseHiddenCallIds,
  shouldListInHistory,
  vapiFetch,
  type VapiCall,
} from "@/lib/vapi";

const PAGE_SIZE = 100;
/** Walk enough VAPI pages that deleted stubs cannot hide older recordings */
const MAX_PAGES = 8;
const MAX_LISTED = 100;

/**
 * VAPI `/call?limit=N` returns the newest N calls including deleted / failed
 * stubs. Filtering only that window made older recordings "fall off" the bottom
 * whenever a new call was created. Paginate until we have enough recorded rows.
 */
async function fetchRecordedCalls(hidden: Set<string>): Promise<VapiCall[]> {
  const listed: VapiCall[] = [];
  let createdAtLt: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (createdAtLt) qs.set("createdAtLt", createdAtLt);

    const res = await vapiFetch(`/call?${qs.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw Object.assign(new Error(data?.message || "Failed to fetch calls"), {
        status: res.status,
        data,
      });
    }

    const raw: VapiCall[] = Array.isArray(data) ? data : data?.results || [];
    if (!raw.length) break;

    for (const c of raw) {
      if (shouldListInHistory(c) && !hidden.has(c.id)) {
        listed.push(c);
        if (listed.length >= MAX_LISTED) return listed;
      }
    }

    const oldest = raw[raw.length - 1]?.createdAt;
    if (!oldest || raw.length < PAGE_SIZE) break;
    createdAtLt = oldest;
  }

  return listed;
}

export async function GET(req: Request) {
  try {
    const hidden = parseHiddenCallIds(req.headers.get("cookie"));
    const calls = await fetchRecordedCalls(hidden);

    return NextResponse.json(calls, {
      headers: {
        "Cache-Control": "private, max-age=8, stale-while-revalidate=30",
      },
    });
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status) || 500
        : 500;
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status });
  }
}
