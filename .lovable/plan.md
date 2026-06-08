## Plan

1. Update the actual landing-page source in this project where the old hero text is still hardcoded.
2. Remove the stale app description copy so browser/install metadata matches the landing page.
3. Re-publish the frontend and verify the live result on the intended domain.
4. If `inrecoapp.inreco.co.za` still differs after publish, check domain mapping because it appears to be serving a different deployment than `app.inreco.co.za`.

## What I found

- `app.inreco.co.za` and the published Lovable URL are serving the same current deployment.
- `inrecoapp.inreco.co.za` is serving a different landing page version that still says `Get Started Free`.
- In this project, the remaining old copy is still present in:
  - `index.html` hero heading
  - `public/manifest.json` description

## Technical details

- Replace the hero/button text in `index.html` so the published frontend matches the preview.
- Update `public/manifest.json` to remove the old “Pocket Labour Consultant” wording from metadata.
- After publish, verify the final rendered text on:
  - the Lovable published URL
  - `app.inreco.co.za`
  - `inrecoapp.inreco.co.za`
- If only `inrecoapp.inreco.co.za` remains stale, the next step is not a code change but fixing which project/deployment that subdomain points to.