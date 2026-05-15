/**
 * Thrown when an env var is missing, malformed, or inconsistent with another
 * env var. Surfaces as a 500 in /api/questions so users don't see a misleading
 * "upstream provider failed" message when the real problem is local config.
 */
export class ConfigurationError extends Error {
  readonly tag = "configuration" as const;

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
