import { useCallback } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isRecordingSupported, useVoiceRecorder } from "@/hooks/useVoiceRecorder";

type Props = {
  onTranscript: (text: string) => void;
  disabled?: boolean;
};

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60).toString();
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function MicButton({ onTranscript, disabled }: Props) {
  const handleBlob = useCallback(async (blob: Blob) => {
    const form = new FormData();
    const ext = blob.type.includes("mp4") ? "mp4" : blob.type.includes("mpeg") ? "mp3" : "webm";
    form.append("file", blob, `recording.${ext}`);
    const { data, error } = await supabase.functions.invoke("cara-transcribe", { body: form });
    if (error) throw new Error(error.message || "Could not transcribe audio.");
    const text = (data as { text?: string } | null)?.text?.trim();
    if (!text) {
      toast.error("CARA couldn't hear that. Try again in a quieter spot.");
      return;
    }
    onTranscript(text);
  }, [onTranscript]);

  const { status, seconds, level, start, stop, maxSeconds } = useVoiceRecorder({
    onBlob: handleBlob,
    onError: (m) => toast.error(m),
  });

  if (!isRecordingSupported()) return null;

  const isRecording = status === "recording";
  const isProcessing = status === "processing" || status === "requesting";

  if (isRecording) {
    const pct = Math.min(100, Math.round((seconds / maxSeconds) * 100));
    const ringScale = 1 + Math.min(0.6, level * 1.8);
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium tabular-nums">
          <span
            className="inline-block h-2 w-2 rounded-full bg-destructive"
            style={{ transform: `scale(${ringScale})`, transition: "transform 80ms linear" }}
            aria-hidden
          />
          {fmt(seconds)} / {fmt(maxSeconds)}
          <span className="ml-1 text-muted-foreground hidden sm:inline">({pct}%)</span>
        </div>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={stop}
          aria-label="Stop recording"
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="outline"
      onClick={start}
      disabled={disabled || isProcessing}
      aria-label={isProcessing ? "Transcribing" : "Hold to record — or tap to start"}
      title={isProcessing ? "Transcribing…" : "Talk to CARA"}
    >
      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
