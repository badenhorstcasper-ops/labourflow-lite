## Finding

The word "Free" has already been removed from every button in the codebase. A repo-wide search returns zero matches, and `index.html` currently reads:

- Hero CTA: **Get Started**
- Contact CTA: **Open iNRECO**
- Bottom CTA: **Get Started**

## Why you still see "Get Started Free"

The screenshot is showing a stale version of the page — most likely either:
1. The **published site** (`app.inreco.co.za` / `basic-task-sparkle.lovable.app`) hasn't been republished since the change, or
2. Your **browser cache** is serving the old `index.html`.

## Plan

No code changes required. To see the update:

1. In the Lovable preview, hard-refresh (Cmd/Ctrl + Shift + R).
2. If you're looking at the live custom domain, click **Publish** to push the latest build:

<presentation-actions>
<presentation-open-publish>Publish your app</presentation-open-publish>
</presentation-actions>

If after a hard refresh + republish you still see "Free" somewhere, send a screenshot of the *preview* URL and I'll dig in further.
