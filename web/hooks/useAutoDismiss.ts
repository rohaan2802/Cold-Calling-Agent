"use client";

import { useEffect } from "react";

/** Clears a message string after `ms` (default 5s). */
export function useAutoDismiss(message: string, clear: () => void, ms = 5000) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(clear, ms);
    return () => clearTimeout(timer);
  }, [message, clear, ms]);
}

/** Runs `clear` once after `ms` when `active` is true (default 5s). */
export function useAutoClearWhen(active: boolean, clear: () => void, ms = 5000) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(clear, ms);
    return () => clearTimeout(timer);
  }, [active, clear, ms]);
}
