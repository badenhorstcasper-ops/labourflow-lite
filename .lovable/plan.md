Nothing to build here — this is two ready-to-paste prompts for your other apps. Paste **both**, one after the other, in each app. Prompt A checks the live site really works. Prompt B closes the security hole I just fixed here.

## Prompt A — "Is the LIVE app actually working?"

```text
Important: there are two copies of this app — the preview I build in, and the
live site my customers use. In the past you tested the preview, said everything
worked, and the live site was broken for weeks because behind-the-scenes
services were never sent live. Do not repeat that.

Do all of the following against the LIVE site only. Never report on the preview.

1. Tell me the live web address you are testing, and confirm it is the public one
   my customers use, not the preview one.

2. List every behind-the-scenes service this app has. For each one, check whether
   it is actually live and answering on the live site. Give me a plain list, one
   line each, with a clear PASS or FAIL and a plain-English name I can understand
   (for example "Send the contact form" rather than the internal name). If any
   are missing from live, send them live and re-check.

3. Open the live site in a fresh browser with nobody signed in and walk through
   it like a new customer: home page, pricing, sign up, sign in, forgot password,
   payment, and every main feature after signing in. PASS or FAIL for each step,
   with what you actually saw. Do not summarise and do not assume.

4. Fix everything that failed, then re-check it on live and show me the new result.

5. Build me a permanent page inside my admin area, visible only to me, with one
   button: "Check live app now". Pressing it tests every behind-the-scenes
   service and every public page on the live site and shows a green or red line
   for each, with the time of the check. Red lines must say what is wrong in
   everyday words. Also run this check automatically once a night, and show me a
   red warning banner in my admin area if the last check found anything broken.

6. From now on, never call anything "tested" or "working" unless you checked it
   on the live site, and always say plainly which copy you tested. Save that as a
   permanent rule for this project.
```

## Prompt B — "Stop strangers filing entries as someone else"

```text
Security fix. My app has tables that anyone can write to without being signed in
(things like error logs, bug reports, contact form messages, waitlist signups,
feedback). Check them and close this hole.

The problem: the web page is allowed to say WHO sent the entry. It sends things
like an account id, an email address, and a status. Nothing stops a stranger from
filing an entry under someone else's email, under a made-up account, or already
marked as "handled" so it never appears in my admin list. They can also send
enormous blocks of text.

What I want:

1. List every table that accepts new entries from people who are not signed in,
   with a one-line plain-English description of what each is for.

2. For each of those, make the database fill in the sensitive fields itself
   instead of trusting the browser. Use a "before insert" trigger that:
   - sets the account id from the signed-in session, blank when nobody is signed
     in, never what the browser claimed
   - looks the email up from the real account, blank for anonymous entries
   - forces any status / handled / resolved / approved / priority field to its
     correct starting value
   - forces "who resolved it / when" fields to empty on creation
   - only allows a value from my approved list for any category field, falling
     back to a safe default
   - trims every free-text field to a sensible maximum length

3. Make those trigger helpers callable only by the trigger — remove the ability
   for the public, anonymous visitors and signed-in users to run them directly.

4. Clean up the app code so it no longer sends the account id or email for these
   entries, since the database now supplies them.

5. Do not lock out honest anonymous use — people who are not signed in must still
   be able to submit successfully.

6. Prove it before you say it's done, by actually submitting test entries against
   the real backend, not by reading the code:
   - as an anonymous visitor, send an entry claiming someone else's email, a fake
     account id and an already-handled status, then show me what was really saved
   - as a signed-in user, send an entry claiming a different account and email,
     then show me what was really saved
   - send one ordinary anonymous entry and confirm it still goes through
   Then delete the test entries.

Show me before-and-after for each test in plain language. If a table can't be
fixed this way, say so and why, rather than skipping it quietly.
```

Two notes: if an app has no anonymous forms, Prompt B should come back and tell you that — that's a valid answer. And the last step in each prompt is the one that matters; without a demand for proof you get a confident "all fixed" with nothing behind it, which is exactly how the live services sat broken here.
