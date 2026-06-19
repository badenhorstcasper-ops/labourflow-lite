
## Goal

Let users **talk to CARA** instead of typing — useful when driving, on the shop floor, or just preferring voice. CARA's reply behavior stays exactly the same (knowledge answer, template wizard button, or AI fallback). No other part of the app changes.

## Recommended UX (most user-friendly for the iNRECO audience)

After looking at `src/pages/Cara.tsx`, the cleanest, lowest-friction pattern is a **mic button next to the Send button**, with two modes:

1. **Tap to start, tap to stop** (primary) — large, obvious, works one-handed. While recording, the mic turns red and shows a live "● Recording 0:07" timer plus a small animated level bar so the user knows it's actually listening. Tap again (or tap a Stop button) to finalize.
2. **Hold-to-talk** (secondary, mobile only) — press and hold the mic, release to send. Faster for quick questions but harder for users with shaky hands or thick gloves, so we keep tap-to-toggle as the default and only enable hold-to-talk on touch devices as a power-user shortcut.

Other recommended touches:
- **Transcript lands in the textarea, not auto-sent.** The user sees what was heard, can fix a word ("UIF" vs "you I F"), then taps Send. This is critical for a labour-law app where one wrong word changes the meaning. A small "Auto-send when I stop talking" toggle (off by default, remembered in localStorage) is offered for true hands-free use in the car.
- **Language defaults to auto-detect** so English / Afrikaans / isiZulu / Xhosa code-switching works without the user picking a language. (SA users mix languages constantly.)
- **Permission handled gracefully** — first tap asks for mic permission with a one-line explainer toast ("CARA needs your mic to listen"). If denied, the mic button shows a tooltip telling them how to re-enable it.
- **Visual + haptic feedback** — short vibration on start/stop (mobile), red pulsing dot while recording, "CARA is listening…" hint, then "Transcribing…" spinner while the audio uploads.
- **Safety rails** — auto-stop at 60 seconds (prevents runaway uploads on a forgotten mic), reject empty/silent clips client-side before uploading (saves credits), and show a clear error if the network drops mid-upload.
- **Unsupported browsers** — if the browser can't record (very old iOS Safari, etc.), the mic button is hidden entirely so nothing looks broken.

No wake-word ("Hey CARA"), no always-on listening — both are battery-hungry, privacy-unfriendly, and overkill for this use case.

## Technical approach

**Provider:** Lovable AI Gateway speech-to-text (`openai/gpt-4o-mini-transcribe`). It's already wired up via `LOVABLE_API_KEY`, no new secret or connector needed, billed per request from existing credits, and supports SA languages well.

**New edge function `cara-transcribe`:**
- Accepts `multipart/form-data` with the audio blob.
- Forwards to `https://ai.gateway.lovable.dev/v1/audio/transcriptions` with `model=openai/gpt-4o-mini-transcribe`, no `language` (auto-detect), streaming **off** (we want the final text in the textarea — streaming adds complexity for no UX gain here).
- Returns `{ text }` to the client. Surfaces 402/429/400 errors with friendly messages.
- Validates: must be multipart, file present, size ≤ 5 MB (we cap recording at 60 s so this is plenty), audio MIME type only.

**New component `src/components/cara/MicButton.tsx`:**
- Uses `MediaRecorder` with `audio/webm` (Chrome/Firefox/Android) or `audio/mp4` (Safari/iOS) — picked via `MediaRecorder.isTypeSupported`.
- Manages: permission request, recording state, elapsed timer, level meter (via `AnalyserNode`), 60 s auto-stop, blob size guard (reject < 1 KB), upload via `supabase.functions.invoke('cara-transcribe', { body: formData })`.
- Emits `onTranscript(text)` to the parent.
- Hidden when `MediaRecorder` or `getUserMedia` is unavailable.

**Wire into `src/pages/Cara.tsx` (minimal change):**
- Add `<MicButton />` between the textarea and the Send button.
- On transcript, append (or replace) the text in the `input` state. If "Auto-send when I stop talking" is on, call `send(text)` directly.
- Add a tiny "Auto-send" toggle (Switch) under the composer, persisted in localStorage.

**No DB changes, no schema changes, no new dependencies** — `MediaRecorder` is browser-native and `supabase.functions.invoke` already handles multipart uploads.

## Files

**Create**
- `supabase/functions/cara-transcribe/index.ts` — audio → text edge function
- `src/components/cara/MicButton.tsx` — recording UI + upload logic
- `src/hooks/useVoiceRecorder.ts` — small hook wrapping `MediaRecorder` (timer, level meter, auto-stop, blob guard) so `MicButton` stays presentational

**Edit**
- `src/pages/Cara.tsx` — mount `<MicButton />` in the composer; add the optional auto-send toggle
- `supabase/config.toml` — register the new function (verify_jwt default)

## Out of scope (explicitly not doing)

- Voice **replies** from CARA (text-to-speech). You said "CARA then replies with wizard or text", so we keep replies text/wizard only. Easy to add later if you want it.
- Continuous / wake-word listening.
- Changing any other page or any of CARA's reply logic.
- Persisting audio files anywhere — the blob lives only in memory until the transcript comes back, then is discarded.

## Cost note

Lovable AI STT is billed per second of audio from existing credits. With a 60 s cap per recording and the mini model, a heavy user doing 50 voice questions a day costs cents, not dollars — well inside your "no extra spend until 10 users" rule.
