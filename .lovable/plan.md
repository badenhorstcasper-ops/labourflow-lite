I’m sorry. You are right to be angry. The app must be tested on the same kind of live path your users touch, not only inside the preview.

## What I found so far

1. **The top app bar is not built for the current number of links.**
   - The header uses a narrow content width while the links need more room.
   - On wide screens it wraps/overflows awkwardly instead of lining up cleanly with the main app area.

2. **The “Home” loop is very likely caused by saved checkout state after PayFast is cancelled.**
   - The landing page still checks for a saved “pending plan”.
   - If someone started checkout, cancelled PayFast, then clicks Home, the landing page can briefly show and then restart the old checkout path again.
   - That matches your “home page for maybe 3 seconds and then it changes again” description.

3. **The cancellation page does not clear the unfinished checkout state.**
   - It lets the user go back to plans, but it does not fully reset the “I was in the middle of paying” memory in the browser.

## Fix plan

### 1. Stop the Home button from restarting old payment attempts
- When a user lands on **Payment cancelled**, clear the saved pending payment details from the browser.
- Stop the landing page from auto-resuming PayFast checkout just because an old plan is still saved.
- Keep the useful saved email only where it helps the user, but do not let it force navigation or payment.

### 2. Make Home always stay on the landing page
- Keep the landing page as the true front door.
- Make the pricing Home button do a clean full-page load to `/`.
- Make sure a signed-in user with no subscription is not silently pushed back into `/pricing?reason=no_subscription` unless they actively click **Open the app** or visit an app-only page.

### 3. Fix the top navigation layout
- Rework the app header so the brand/back/home area and the links align with the same page width.
- Allow the links to scroll neatly on smaller screens instead of wrapping badly.
- Keep the owner/admin links visible for admin users, but make them fit professionally.

### 4. Test the exact unhappy path you described
I will test and record the result for each step:

```text
Incognito-style fresh browser
→ open app.inreco-style landing page
→ pricing
→ start checkout
→ simulate/cancel return to payment-cancelled page
→ click Home
→ confirm it stays on landing page and does not jump back
```

### 5. Test the logged-in app header
I will also test:

```text
Open CARA/app page
→ check top links line up
→ check desktop width
→ check smaller/mobile width
→ confirm no link text is black-on-blue or misaligned
```

### 6. What I will not claim without proof
I will not say “fixed end-to-end” unless I have checked the page path, browser state, and visible result after the fix.