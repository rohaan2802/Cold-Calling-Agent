"use client";

import { useEffect, useRef, useState } from "react";
import { useAutoDismiss } from "@/hooks/useAutoDismiss";
import { friendlyUserError, userMsg } from "@/lib/callErrors";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mediaDuration(audio: HTMLAudioElement): number {
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
  try {
    if (audio.seekable?.length) {
      const end = audio.seekable.end(audio.seekable.length - 1);
      if (Number.isFinite(end) && end > 0) return end;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const samples = buffer.length;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = samples * blockAlign;
  const headerSize = 44;
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

/**
 * Decode recording, boost to true peak max (~0 dBFS), export loud WAV for download.
 */
async function amplifyBlobToMaxWav(blob: Blob): Promise<Blob> {
  const OfflineCtx =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  const arrayBuf = await blob.arrayBuffer();
  const probeCtx = new OfflineCtx(1, 1, 44100);
  const decoded = await probeCtx.decodeAudioData(arrayBuf.slice(0));

  let peak = 0;
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const data = decoded.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const a = Math.abs(data[i]);
      if (a > peak) peak = a;
    }
  }

  // Max loudness without hard digital overflow (leave tiny headroom)
  const targetPeak = 0.99;
  const gain = peak > 0.00001 ? targetPeak / peak : 20;

  const offline = new OfflineCtx(
    decoded.numberOfChannels,
    decoded.length,
    decoded.sampleRate
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;
  const gainNode = offline.createGain();
  gainNode.gain.value = gain;
  source.connect(gainNode);
  gainNode.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();

  // Hard clamp any overs from float rounding
  for (let c = 0; c < rendered.numberOfChannels; c++) {
    const data = rendered.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 1) data[i] = 1;
      else if (data[i] < -1) data[i] = -1;
    }
  }

  return audioBufferToWavBlob(rendered);
}

/**
 * Reliable recording player: native audio first (always works), optional loudness boost.
 * Download exports a max-volume WAV (peak-normalized) to the user's device.
 */
export default function AmplifiedPlayer({
  src,
  boost = 5,
  downloadName = "recording",
}: {
  src: string;
  boost?: number;
  /** Base filename without extension (e.g. vantora-call-abc) */
  downloadName?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const hookedRef = useRef(false);
  const scrubbingRef = useRef(false);
  const blobUrlRef = useRef<string | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const [level, setLevel] = useState(boost);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [boostOn, setBoostOn] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(true);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useAutoDismiss(error, () => setError(""), 5000);

  useEffect(() => {
    let cancelled = false;

    async function loadAudio() {
      setLoadingAudio(true);
      setError("");
      setDuration(0);
      setCurrent(0);
      setPlaying(false);
      setBoostOn(false);
      hookedRef.current = false;

      try {
        ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
      gainRef.current = null;

      const prevUrl = blobUrlRef.current;
      blobUrlRef.current = null;
      blobRef.current = null;

      // Progressive play ASAP via same-origin stream (no wait for full download)
      setObjectUrl(src);
      if (!cancelled) setLoadingAudio(false);

      // Background: cache blob for loud download (does not block Play)
      try {
        const res = await fetch(src, { credentials: "same-origin" });
        if (cancelled) return;
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok || contentType.includes("application/json")) {
          const data = await res.json().catch(() => ({}));
          if (!cancelled) {
            setError(
              friendlyUserError(
                typeof data.error === "string" ? data.error : userMsg("recordingUnavailable")
              )
            );
            setObjectUrl(null);
          }
          return;
        }
        const raw = await res.blob();
        if (cancelled) return;
        const typed =
          raw.type && raw.type.startsWith("audio")
            ? raw
            : new Blob([raw], { type: "audio/mpeg" });
        if (typed.size < 100) {
          if (!cancelled) {
            setError(userMsg("recordingUnavailable"));
            setObjectUrl(null);
          }
          return;
        }
        blobRef.current = typed;
      } catch (e) {
        if (!cancelled) setError(friendlyUserError(e));
      } finally {
        if (prevUrl) URL.revokeObjectURL(prevUrl);
      }
    }

    loadAudio();

    return () => {
      cancelled = true;
      try {
        ctxRef.current?.close();
      } catch {
        /* ignore */
      }
      ctxRef.current = null;
      gainRef.current = null;
      hookedRef.current = false;
      const toRevoke = blobUrlRef.current;
      blobUrlRef.current = null;
      if (toRevoke) {
        setTimeout(() => URL.revokeObjectURL(toRevoke), 1500);
      }
    };
  }, [src]);

  function ensureBoost() {
    const audio = audioRef.current;
    if (!audio || hookedRef.current || !objectUrl) return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audio);
      const gain = ctx.createGain();
      gain.gain.value = level;
      source.connect(gain);
      gain.connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
      hookedRef.current = true;
      setBoostOn(true);
    } catch {
      // Keep native playback — do not mark hooked so we can keep using element.volume
      hookedRef.current = false;
      setBoostOn(false);
    }
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio || loadingAudio || !objectUrl) return;
    try {
      setError("");
      if (!hookedRef.current) {
        ensureBoost();
      }
      if (ctxRef.current?.state === "suspended") {
        await ctxRef.current.resume();
      }
      if (gainRef.current) {
        gainRef.current.gain.value = level;
      } else {
        audio.volume = 1;
      }
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (e) {
      // Last resort: plain play without boost graph
      try {
        audio.volume = 1;
        await audio.play();
      } catch (e2) {
        setError(friendlyUserError(e2));
      }
    }
  }

  function syncDuration(audio: HTMLAudioElement) {
    const d = mediaDuration(audio);
    if (d > 0) setDuration(d);
  }

  function seekTo(value: number) {
    const audio = audioRef.current;
    if (!audio || !objectUrl || !Number.isFinite(value)) return;
    const max = mediaDuration(audio) || duration || value;
    const next = Math.min(Math.max(0, value), max > 0 ? max : value);
    try {
      audio.currentTime = next;
      setCurrent(audio.currentTime);
      syncDuration(audio);
    } catch {
      setError(userMsg("recordingPlay"));
    }
  }

  function skip(delta: number) {
    const audio = audioRef.current;
    if (!audio || !objectUrl) return;
    seekTo(audio.currentTime + delta);
  }

  function onLevelChange(value: number) {
    setLevel(value);
    if (gainRef.current) {
      gainRef.current.gain.value = value;
    }
  }

  async function downloadRecording() {
    setDownloading(true);
    setError("");
    try {
      let blob = blobRef.current;
      if (!blob) {
        const res = await fetch(src, { credentials: "same-origin" });
        if (!res.ok) throw new Error(userMsg("recordingDownload"));
        blob = await res.blob();
        blobRef.current = blob;
      }
      const loud = await amplifyBlobToMaxWav(blob);
      const safeBase =
        downloadName.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "recording";
      const filename = `${safeBase}.wav`;
      const url = URL.createObjectURL(loud);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      setError(friendlyUserError(e) || userMsg("recordingDownload"));
    } finally {
      setDownloading(false);
    }
  }

  const seekMax = duration > 0 ? duration : Math.max(current, 0.1);
  const ready = Boolean(objectUrl) && !loadingAudio;

  return (
    <div className="amp-player">
      {objectUrl && (
        <audio
          ref={audioRef}
          preload="auto"
          src={objectUrl}
          controls={false}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(e) => syncDuration(e.currentTarget)}
          onDurationChange={(e) => syncDuration(e.currentTarget)}
          onCanPlay={(e) => syncDuration(e.currentTarget)}
          onTimeUpdate={(e) => {
            if (!scrubbingRef.current) {
              setCurrent(e.currentTarget.currentTime);
            }
            syncDuration(e.currentTarget);
          }}
          onError={() => setError(userMsg("recordingPlay"))}
        />
      )}

      {loadingAudio && <p className="hint">Loading recording…</p>}
      {!loadingAudio && ready && !error && (
        <p className="hint ok-inline">Recording ready — press Play.</p>
      )}

      <div className="amp-controls">
        <button
          type="button"
          className="amp-btn"
          onClick={() => skip(-10)}
          disabled={!ready}
          title="Back 10s"
        >
          −10s
        </button>
        <button
          type="button"
          className="amp-btn primary"
          onClick={togglePlay}
          disabled={!ready}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="amp-btn"
          onClick={() => skip(10)}
          disabled={!ready}
          title="Forward 10s"
        >
          +10s
        </button>
        <button
          type="button"
          className="amp-btn"
          onClick={() => void downloadRecording()}
          disabled={!ready || downloading}
          title="Download recording to your device"
        >
          {downloading ? "Saving…" : "Download"}
        </button>
      </div>

      <div className="amp-seek-wrap">
        <span className="amp-time">{formatTime(current)}</span>
        <input
          className="amp-seek"
          type="range"
          min={0}
          max={seekMax}
          step={0.1}
          value={Math.min(current, seekMax)}
          disabled={!ready}
          aria-label="Scrub recording forward or back"
          onPointerDown={() => {
            scrubbingRef.current = true;
          }}
          onPointerUp={(e) => {
            scrubbingRef.current = false;
            seekTo(Number(e.currentTarget.value));
          }}
          onChange={(e) => {
            const v = Number(e.target.value);
            setCurrent(v);
            if (!scrubbingRef.current) seekTo(v);
          }}
          onInput={(e) => {
            const v = Number((e.target as HTMLInputElement).value);
            setCurrent(v);
            seekTo(v);
          }}
        />
        <span className="amp-time">{formatTime(duration)}</span>
      </div>

      <label className="amp-label" htmlFor="amp-boost">
        Loudness boost: {level.toFixed(1)}x{boostOn ? " (on)" : ""}
      </label>
      <input
        id="amp-boost"
        className="amp-slider"
        type="range"
        min={1}
        max={8}
        step={0.1}
        value={level}
        onChange={(e) => onLevelChange(Number(e.target.value))}
      />
      {error && <p className="error-box">{error}</p>}
    </div>
  );
}
