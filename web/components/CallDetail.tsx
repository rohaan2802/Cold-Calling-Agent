"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AmplifiedPlayer from "@/components/AmplifiedPlayer";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import { friendlyUserError, userMsg } from "@/lib/callErrors";
import {
  formatDuration,
  getCallLabel,
  getCallTypeLabel,
  getDurationSeconds,
  getOutcome,
  getTranscript,
  type VapiCall,
} from "@/lib/vapi";

export default function CallDetail({ id }: { id: string }) {
  const router = useRouter();
  const [call, setCall] = useState<VapiCall | null>(null);
  /** Full history — needed so "Call Agent 4" matches the list, not fake "1" */
  const [siblings, setSiblings] = useState<VapiCall[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useAutoDismiss(error, () => setError(""), 5000);
  useEffect(() => {
    async function load() {
      try {
        const [oneRes, listRes] = await Promise.all([
          fetch(`/api/calls/${id}`, { credentials: "same-origin" }),
          fetch("/api/calls", { credentials: "same-origin" }),
        ]);
        const data = await oneRes.json().catch(() => ({}));
        if (!oneRes.ok) {
          setError(friendlyUserError(data.error || userMsg("callNotFound")));
          return;
        }
        setCall(data);

        const list = await listRes.json().catch(() => []);
        if (listRes.ok && Array.isArray(list)) {
          // Ensure current call is in the set even if filters differ slightly
          const byId = new Map<string, VapiCall>(list.map((c: VapiCall) => [c.id, c]));
          byId.set(data.id, data);
          setSiblings([...byId.values()]);
        } else {
          // Don't fake "Call Agent 1" — label falls back to short id
          setSiblings([]);
        }
      } catch (err) {
        setError(friendlyUserError(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this call, transcript, and recording permanently?")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/calls/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        setDeleting(false);
        return;
      }
      if (data.ok === false) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        setDeleting(false);
        return;
      }
      router.push("/calls");
      router.refresh();
    } catch (err) {
      setError(friendlyUserError(err));
      setDeleting(false);
    }
  }

  if (loading) return <p className="muted">Loading call…</p>;
  if (error && !call) return <p className="error-box">{error}</p>;
  if (!call) return <p className="muted">Call not found.</p>;

  const transcript = getTranscript(call);
  const who = getCallLabel(call, siblings);

  return (
    <article className="panel detail-panel">
      <div className="detail-top">
        <Link href="/calls" className="back-link">
          <span className="back-arrow" aria-hidden="true">
            ←
          </span>
          All calls
        </Link>
        <button
          type="button"
          className="danger-btn"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting…" : "Delete call"}
        </button>
      </div>

      {error && <p className="error-box">{error}</p>}

      <div className="panel-head">
        <p className="eyebrow">Call record</p>
        <h1>{who}</h1>
        <p className="lede">
          {call.startedAt ? new Date(call.startedAt).toLocaleString() : "—"} ·{" "}
          {formatDuration(getDurationSeconds(call))} · {getOutcome(call)}
        </p>
      </div>

      <div className="detail-grid">
        <div>
          <h3>Recording</h3>
          <AmplifiedPlayer
            src={`/api/calls/${id}/recording`}
            boost={5}
            downloadName={`vantora-call-${id.slice(0, 8)}`}
          />
          <p className="hint">
            Play in the browser, or tap Download to save a max-volume WAV on your device. If
            playback fails, wait 30–60s after the call ends, then refresh.
          </p>
        </div>

        <div>
          <h3>Details</h3>
          <dl className="meta-list">
            <div>
              <dt>Call ID</dt>
              <dd>{call.id}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{getCallTypeLabel(call)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{call.status || "—"}</dd>
            </div>
            <div>
              <dt>Ended reason</dt>
              <dd>{call.endedReason || "—"}</dd>
            </div>
            <div>
              <dt>Storage</dt>
              <dd>VAPI cloud (not a local DB)</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="transcript-block">
        <h3>Transcript</h3>
        {transcript ? (
          <pre>{transcript}</pre>
        ) : (
          <p className="muted">Transcript not ready yet. Refresh in a minute.</p>
        )}
      </div>
    </article>
  );
}
