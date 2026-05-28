# iNRECO — Security overview (plain English)

## What's protected
- **Login**: email + password, plus Google sign-in. Passwords are checked against the *Have I Been Pwned* leaked-password database.
- **Company profile, documents, subscriptions, team, devices**: each row is locked to its owner (Row-Level Security). One user can never read another user's data.
- **Generated PDF/Word files**: stored in a **private** bucket. Downloads only work through short-lived signed links (1 hour for owners, 30 min for share links). Share links expire after 7 days.
- **Admin pages** (`/account-app/health`): only visible to accounts flagged with the `admin` role in the database.
- **Error logs & bug reports**: anyone can write (so problems get captured), but **only admins can read**.
- **PayFast webhook**: validated four ways — merchant ID, source IP, server-to-server callback to PayFast, and amount-vs-plan price check. Replays are blocked.

## What's intentionally public
- Marketing pages (`/`, `/pricing`, `/contact`).
- The shared document viewer at `/d/<token>` — anyone with the link can view, until the link expires or is revoked.
- The contact form (`contact_messages` accepts inserts from anyone, but no one except admins/service role can read them).

## What should never happen
- A user reading another user's documents, profile, subscription, or devices.
- Generating a document without owner's company branding.
- A PayFast ITN activating a plan without all four checks passing.
- An error or bug report being readable by a non-admin user.

## How errors are captured
- All uncaught JavaScript errors and unhandled promise rejections are logged automatically to the `error_logs` table.
- Each gets a short ID (e.g. `A3F2B19C`).
- View them at `/account-app/health` and copy them to Lovable chat for a quick fix.

## If you suspect a problem
1. Change your password.
2. Open `/account-app/health` and screenshot recent errors.
3. Message Lovable.

## What to NOT create vulnerabilities for
- Public read access on `contact_messages` — intentionally write-only.
- Public read access on shared documents via `/d/<token>` — that's the share feature.
- `payfast-webhook` and `get-shared-document` edge functions are intentionally public (no JWT).
