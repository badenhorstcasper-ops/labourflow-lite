import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 60;
const MIN_BYTES = 1024;

export type RecorderStatus = "idle" | "requesting" | "recording" | "processing" | "error";

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* noop */
    }
  }
  return null;
}

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined" &&
    pickMimeType() !== null
  );
}

export type UseVoiceRecorderOptions = {
  onBlob: (blob: Blob) => void | Promise<void>;
  onError?: (message: string) => void;
};

export function useVoiceRecorder({ onBlob, onError }: UseVoiceRecorderOptions) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [level, setLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    setLevel(0);
    setSeconds(0);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const start = useCallback(async () => {
    if (status === "recording" || status === "requesting") return;
    const mimeType = pickMimeType();
    if (!mimeType) {
      onError?.("This browser can't record audio.");
      setStatus("error");
      return;
    }

    setStatus("requesting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch {
      onError?.("Microphone access was denied. Enable it in your browser settings to talk to CARA.");
      setStatus("idle");
      return;
    }
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      chunksRef.current = [];
      cleanup();
      if (blob.size < MIN_BYTES) {
        setStatus("idle");
        onError?.("That recording was too short. Please try again.");
        return;
      }
      setStatus("processing");
      try {
        await onBlob(blob);
        setStatus("idle");
      } catch (err) {
        setStatus("error");
        onError?.(err instanceof Error ? err.message : String(err));
      }
    };

    // Level meter
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i];
        const avg = sum / data.length / 255;
        setLevel(avg);
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* level meter is non-essential */
    }

    startedAtRef.current = Date.now();
    setSeconds(0);
    tickRef.current = setInterval(() => {
      const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) {
        recorder.state === "recording" && recorder.stop();
      }
    }, 250);

    recorder.start();
    setStatus("recording");
    try { navigator.vibrate?.(20); } catch { /* noop */ }
  }, [status, onBlob, onError, cleanup]);

  const stop = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      try { navigator.vibrate?.(20); } catch { /* noop */ }
      rec.stop();
    }
  }, []);

  const cancel = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.onstop = null;
      rec.stop();
    }
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  return { status, seconds, level, start, stop, cancel, maxSeconds: MAX_SECONDS };
}
