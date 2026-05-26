## Fix blank page — single import change

**File:** `src/components/TeamManagement.tsx`

**Change:** Replace lines 1–11 (the `createClient` block) with the shared client import.

Remove:
```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  (import.meta.env.VITE_SUPABASE_URL as string) || "",
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ||
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ||
    "",
);
```

Add:
```ts
import { supabase } from "@/integrations/supabase/client";
```

Keep the existing `useEffect/useMemo/useState` import from React and all other code untouched.

No other files modified. No design, layout, or feature changes.