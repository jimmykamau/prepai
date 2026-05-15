import { ConfigurationError } from "./errors";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const HAS_SECRET = Boolean(process.env.TURNSTILE_SECRET_KEY);
const HAS_SITE_KEY = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

const FATAL_MISMATCH =
  HAS_SECRET && !HAS_SITE_KEY
    ? "TURNSTILE_SECRET_KEY is set but NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing — the client cannot produce a token. Set both or unset both."
    : null;

if (FATAL_MISMATCH) {
  console.error("[turnstile] " + FATAL_MISMATCH);
} else if (HAS_SITE_KEY && !HAS_SECRET) {
  console.warn(
    "[turnstile] NEXT_PUBLIC_TURNSTILE_SITE_KEY is set but TURNSTILE_SECRET_KEY is missing — server-side verification is being skipped.",
  );
}

export function turnstileEnabled(): boolean {
  return HAS_SECRET;
}

export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (FATAL_MISMATCH) {
    throw new ConfigurationError(FATAL_MISMATCH);
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: true };
  }

  if (!token) {
    return { ok: false, reason: "missing-token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    body,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });

  if (!res.ok) {
    return { ok: false, reason: `verify-http-${res.status}` };
  }

  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  if (data.success) return { ok: true };
  return { ok: false, reason: data["error-codes"]?.join(",") ?? "verify-failed" };
}
