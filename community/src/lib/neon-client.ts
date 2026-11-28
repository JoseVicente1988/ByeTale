"use client";

import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const authUrl =
  process.env.NEXT_PUBLIC_NEON_AUTH_URL ??
  "https://ep-purple-leaf-aydn188b.neonauth.c-5.us-east-2.aws.neon.tech/neondb/auth";

const dataApiUrl =
  process.env.NEXT_PUBLIC_NEON_DATA_API_URL ??
  "https://ep-purple-leaf-aydn188b.apirest.c-5.us-east-2.aws.neon.tech/neondb/rest/v1";

export const neon = createClient({
  auth: {
    adapter: BetterAuthReactAdapter(),
    url: authUrl,
    allowAnonymous: true,
  },
  dataApi: {
    url: dataApiUrl,
  },
});
