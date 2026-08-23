"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import { friendlyUserError, userMsg } from "@/lib/callErrors";
import {
  formatDuration,
  getCallLabel,
  getCallTypeLabel,
  getDurationSeconds,
  getOutcome,
  type VapiCall,
} from "@/lib/vapi";

const PAGE_SIZE = 10;

export default function CallHistory() {
  const [calls, setCalls] = useState<VapiCall[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useAutoDismiss(error, () => setError(""), 5000);
  useAutoDismiss(info, () => setInfo(""), 5000);

  const totalPages = Math.max(1, Math.ceil(calls.length / PAGE_SIZE));

  const pageCalls = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return calls.slice(start, start + PAGE_SIZE);
  }, [calls, page]);

  async function load(isRefresh = false) {
    if (!isRefresh) setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/calls", {
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("loadCalls")));
        if (!isRefresh) setCalls([]);
        return;
      }
      const next = Array.isArray(data) ? data : [];
      setCalls(next);
      setPage((p) => {
        const pages = Math.max(1, Math.ceil(next.length / PAGE_SIZE));
        return Math.min(p, pages);
      });
    } catch (err) {
      setError(friendlyUserError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
  }, []);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this call and its recording permanently?")) return;

    setCalls((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(id);
    setError("");
    setInfo("");

    try {
      const res = await fetch(`/api/calls/${id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        await load(true);
        return;
      }
      if (data.ok === false) {
        setError(friendlyUserError(data.error || userMsg("deleteFail")));
        return;
      }
      setInfo(
        data.deletedOnVapi
          ? "Call and recording permanently deleted from VAPI."
          : "Call deleted."
      );
    } catch (err) {
      setError(friendlyUserError(err));
      await load(true);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="panel history-panel">
      <div className="panel-head row">
        <div>
          <p className="eyebrow">Saved on every call</p>
          <h2>Call history</h2>
          <p className="lede">
            Recordings and transcripts from your calls — open any row to replay.
          </p>
        </div>
        <button
          type="button"
          className="ghost-btn"
          onClick={() => load(true)}
          disabled={loading}
        >
          {loading && calls.length ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && calls.length === 0 && <p className="muted">Loading calls…</p>}
      {error && <p className="error-box">{error}</p>}
      {info && !error && <p className="ok-box">{info}</p>}

      {!loading && !error && calls.length === 0 && (
        <p className="muted">No calls yet. Use Call Agent or place one outbound call.</p>
      )}

      <ul className="call-list">
        {pageCalls.map((call) => {
          const duration = formatDuration(getDurationSeconds(call));
          // Full list keeps Call Agent N stable across pages
          const who = getCallLabel(call, calls);
          const when = call.startedAt || call.createdAt;
          return (
            <li key={call.id}>
              <div className="call-row">
                <Link href={`/calls/${call.id}`} className="call-main">
                  <strong>{who}</strong>
                  <span className="meta">
                    {when ? new Date(when).toLocaleString() : "—"} · {duration} ·{" "}
                    {getCallTypeLabel(call)}
                  </span>
                </Link>
                <div className="call-actions">
                  <span className="badge">{getOutcome(call)}</span>
                  <button
                    type="button"
                    className="danger-btn sm"
                    onClick={(e) => handleDelete(call.id, e)}
                    disabled={deletingId === call.id}
                  >
                    {deletingId === call.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {calls.length > PAGE_SIZE && (
        <div className="pager" role="navigation" aria-label="Call pages">
          <button
            type="button"
            className="ghost-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <p className="pager-meta">
            Page {page} of {totalPages}
            <span className="muted"> · {calls.length} calls</span>
          </p>
          <button
            type="button"
            className="ghost-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </section>
  );
}
