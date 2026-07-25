## Found it — this is the correct repo ✅

`badenhorstcasper-ops/inreco-app-landing` is the real one. Proof:
- Its `CNAME` file literally says `inrecoapp.inreco.co.za`.
- Its `<title>` matches what the live site shows: *"iNRECO — Your Personal Pocket Labour Consultant"*.
- It's a single-file site (one `index.html`, ~1 MB, with images baked in) hosted on **GitHub Pages** — no build step, no framework. Edit the file, GitHub Pages redeploys automatically within a minute.

## What needs to change (to match `app.inreco.co.za`)

Based on your earlier instructions and my scan of the current file:

1. **Title**: "iNRECO — Your **Personal** Pocket Labour Consultant" → "iNRECO — Your Pocket Labour Consultant"
2. **Hero headline**: same wording fix — drop "Personal", drop any "Scale as you grow." sub-line if present.
3. **Hero button label**: "Start free" → "Start Free" (proper caps).
4. **All pricing tier buttons** (Get Solo, Get Business, Get Professional) currently jump to `https://app.inreco.co.za` (the app's home). Repoint each to `https://app.inreco.co.za/pricing` so the visitor lands on the actual pricing/trial screen — this was the exact "trial button loops back" bug we already fixed inside the app; the landing has the same issue and needs the same fix.
5. **Footer**: add the four missing links in this order, separated by " · ":
   - Terms → `https://app.inreco.co.za/terms`
   - Privacy → `https://app.inreco.co.za/privacy`
   - Disclaimer → `https://app.inreco.co.za/disclaimer`
   - Become a partner → `https://app.inreco.co.za/partner/apply`
6. **Enterprise "Contact Us"** button already goes to `mailto:info@inreco.co.za` — leave as is (matches your "no personal email exposed" rule).

## The plan — one file, one upload

Because the `index.html` is ~1 MB (images embedded), copy-pasting inside GitHub's web editor is painful. So I'll do it the easiest way for you:

### Step 1 — I prepare the new file (I do this, no action from you)
Once you approve, I download the current `index.html`, apply the 6 changes above exactly, and save the finished file to a downloadable location. I also do a self-check: I open the finished file and click through every link before handing it to you.

### Step 2 — You upload the replacement (one drag-and-drop)
I'll give you a link to download the finished file. Then:
1. Open **https://github.com/badenhorstcasper-ops/inreco-app-landing**.
2. Click the existing **`index.html`** in the file list.
3. Click the **pencil icon** (top right of the file) → **"Delete file"** → green button **"Commit changes"**. (This clears the old one out of the way.)
4. Back on the repo home, click **"Add file"** → **"Upload files"**.
5. Drag the new `index.html` I gave you into the upload area.
6. Click green **"Commit changes"**.
7. Wait ~60 seconds. Refresh `https://inrecoapp.inreco.co.za`. Done.

*(If you prefer, you can also click the pencil on the existing file and paste the new content in place — but with a 1 MB file, the drag-and-drop replace is far less likely to freeze your browser.)*

### Step 3 — I verify from my side
Reply **"uploaded"** and I'll open `inrecoapp.inreco.co.za`, click every button and every footer link, and confirm each one lands on the correct `app.inreco.co.za` page. If anything is off, I give you a corrected file — same process.

## What I will NOT touch

- Domains.co.za (no DNS changes).
- PayFast (no keys, no settings).
- The `app.inreco.co.za` project (this one).
- The `emp-ly-buddy` repo (that's a different, unrelated app called "DomestiSure" — leave it alone).

Approve this and I'll produce the new file straight away.
