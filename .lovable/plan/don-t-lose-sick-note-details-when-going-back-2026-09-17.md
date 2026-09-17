# Don't lose sick-note details when going back

## The problem

On the Verify Sick Note screen, everything typed in step 1 disappears if you leave the screen or press the phone's back button while in step 2. Right now the details only live in the open screen, so the moment the screen reloads they are gone, and step 1 is also locked for editing once you move on.

## What will change

1. **Nothing is lost, ever.** As you type, the details are quietly kept on your device. If you come back to the screen — after a back press, an accidental refresh, or switching away to a register website — everything is filled in again exactly as you left it, including which step you were on and what you recorded in step 2.

2. **A clear "you have an unfinished check" note.** When a saved draft is found, a small bar appears at the top: "Continuing your unfinished check" with a "Start a new one instead" button, so you're never confused about whose details you are looking at.

3. **The back button behaves.** While you are in step 2 or 3, pressing back takes you to the previous step of the check instead of throwing you out of the screen. Pressing back from step 1 leaves the screen as normal.

4. **You can fix a typo without starting over.** Step 1 gets an "Edit details" button once you've moved on, so you can correct something you spotted on the register site and carry on where you were.

5. **The draft clears itself** when the check is finished or when you choose to start a new one, so old details never leak into the next check.

## Technical notes

- `src/pages/VerifyCertificate.tsx` (`NewCheckFlow`): persist `form`, `step`, `hpcsa`, `pcns`, `notes`, `verificationId`, and `outcome` to `localStorage` under a per-user key (e.g. `inreco.mcv.draft.<userId>`) on change, debounced; hydrate from it on mount.
- The uploaded certificate file itself cannot be restored from storage; if a draft is restored and a file had been chosen, show a small hint to re-attach it. Everything else restores.
- Back-button handling via a `history.pushState` entry per step plus a `popstate` listener inside the flow, cleaned up on unmount.
- Step 1 re-edit: replace the hard `disabled={step > 1}` lock with an `editingStep1` flag; when saving edits again, update the existing verification row (by `verificationId`) rather than inserting a new one, and write an audit event for the amendment.
- Clear the stored draft on successful completion, on "Start a new one instead", and on sign-out.
