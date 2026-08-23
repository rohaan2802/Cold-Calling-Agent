"use client";

import { useState } from "react";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import {
  friendlyUserError,
  userMsg,
  validateOutboundPhone,
} from "@/lib/callErrors";

export default function OutboundDialer() {
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useAutoDismiss(error, () => setError(""), 5000);
  useAutoDismiss(message, () => setMessage(""), 5000);

  async function placeCall(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const validated = validateOutboundPhone(number);
    if (!validated.ok) {
      setError(validated.error);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: validated.e164 }),
      });

      let data: { error?: string; id?: string } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(friendlyUserError(data.error || userMsg("genericStart")));
        return;
      }

      setMessage(userMsg("outboundStarted"));
      setNumber("");
    } catch (err) {
      setError(friendlyUserError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel dialer-panel">
      <div className="panel-head">
        <p className="eyebrow">Real cold call</p>
        <h2>Outbound call</h2>
        <p className="lede">
          Places a real phone call to a US (+1) number such as TextMe. Free line: limited outbound
          attempts per day.
        </p>
      </div>

      <form className="dialer-form" onSubmit={placeCall} noValidate>
        <label htmlFor="phone">Phone number (with country code)</label>
        <div className="dialer-row">
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+14155552671"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            aria-invalid={Boolean(error)}
          />
          <button type="submit" disabled={loading || !number.trim()}>
            {loading ? "Calling…" : "Call now"}
          </button>
        </div>
        <p className="hint">Example: +1 415 555 2671</p>
      </form>

      {message && <p className="ok-box">{message}</p>}
      {error && <p className="error-box">{error}</p>}
    </section>
  );
}
