## What
Remove the word "Free" from every visible button / CTA in the app.

## Where
The only buttons that contain "Free" are in `index.html`:
- **Line 435** — hero "Get Started Free" → "Get Started"
- **Line 609** — contact section "Open iNRECO Free" → "Open iNRECO"
- **Line 624** — bottom CTA "Get Started Free" → "Get Started"

No other source files (React components, etc.) contain "Free" in button text.

## Result
Three button labels updated; nothing else changes.