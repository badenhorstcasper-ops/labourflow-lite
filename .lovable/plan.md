## Add PayFast secrets

Add two runtime secrets so the PayFast edge functions can verify signatures and know which environment to use.

### Steps
1. Call `secrets--add_secret` for `PAYFAST_PASSPHRASE` and `PAYFAST_MODE`.
2. Secure form appears for the user to enter the actual values.
3. Values entered:
   - **PAYFAST_PASSPHRASE**: `Inreco-best-platform-2026-growth`
   - **PAYFAST_MODE**: `live`

### What this enables
- `payfast-webhook` edge function will verify ITN signatures using the passphrase.
- `payfast-cancel` edge function will use the same passphrase to sign cancel API calls.
- Both functions will switch from sandbox to live PayFast hosts automatically.

No file changes needed — secrets are stored in the backend, not in code.