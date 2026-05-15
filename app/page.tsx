"use client";

import { useRef, useState } from "react";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import type { Question, QuestionsPayload } from "@/lib/schema";

const EXAMPLE_TITLE = "Customer Success Manager";
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

const CATEGORY_CHIP: Record<Question["category"], string> = {
  Behavioral: "chip chip-behavioral",
  Situational: "chip chip-situational",
  Technical: "chip chip-technical",
  Strategic: "chip chip-strategic",
  Cultural: "chip chip-cultural",
};

type View =
  | { kind: "idle" }
  | { kind: "loading"; jobTitle: string }
  | { kind: "error"; jobTitle: string; message: string }
  | { kind: "results"; jobTitle: string; questions: Question[] };

export default function Home() {
  const [jobTitle, setJobTitle] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | undefined>(undefined);

  const trimmed = jobTitle.trim();
  const turnstileNeeded = Boolean(TURNSTILE_SITE_KEY);
  const canSubmit =
    trimmed.length >= 2 &&
    trimmed.length <= 120 &&
    view.kind !== "loading" &&
    (!turnstileNeeded || Boolean(turnstileToken));

  function handleJobTitleChange(value: string) {
    setJobTitle(value);
    if (view.kind === "error") {
      setView({ kind: "idle" });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setView({ kind: "loading", jobTitle: trimmed });

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobTitle: trimmed,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });

      const data = (await res.json()) as Partial<QuestionsPayload> & { error?: string };
      if (!res.ok || !data.questions) {
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }

      setView({ kind: "results", jobTitle: trimmed, questions: data.questions });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setView({ kind: "error", jobTitle: trimmed, message });
    } finally {
      if (turnstileNeeded) {
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }
    }
  }

  function reset() {
    setView({ kind: "idle" });
    setJobTitle("");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main
        className={`flex-1 w-full max-w-[1280px] mx-auto px-6 sm:px-10 py-12 sm:py-16 ${
          view.kind !== "results" ? "flex items-center justify-center" : ""
        }`}
      >
        {view.kind !== "results" ? (
          <LandingView
            jobTitle={jobTitle}
            onJobTitleChange={handleJobTitleChange}
            onSubmit={handleSubmit}
            canSubmit={canSubmit}
            isLoading={view.kind === "loading"}
            error={view.kind === "error" ? view.message : null}
            turnstileSiteKey={TURNSTILE_SITE_KEY}
            onTurnstileSuccess={setTurnstileToken}
            onTurnstileExpire={() => setTurnstileToken(null)}
            turnstileRef={turnstileRef}
          />
        ) : (
          <ResultsView
            jobTitle={view.jobTitle}
            questions={view.questions}
            onReset={reset}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="w-full border-b border-outline bg-card">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-lg font-semibold tracking-tight">PrepAI</span>
        </div>
        <span className="hidden sm:inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-fg">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Powered by AI
        </span>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-card"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path
          d="M4 18V6h4l4 12 4-12h4v12"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

type LandingProps = {
  jobTitle: string;
  onJobTitleChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  canSubmit: boolean;
  isLoading: boolean;
  error: string | null;
  turnstileSiteKey: string | undefined;
  onTurnstileSuccess: (token: string) => void;
  onTurnstileExpire: () => void;
  turnstileRef: React.RefObject<TurnstileInstance | undefined>;
};

function LandingView({
  jobTitle,
  onJobTitleChange,
  onSubmit,
  canSubmit,
  isLoading,
  error,
  turnstileSiteKey,
  onTurnstileSuccess,
  onTurnstileExpire,
  turnstileRef,
}: LandingProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
      <span className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-soft-fg mb-6">
        Interview prep, in 5 seconds
      </span>

      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-primary">
        Get three thoughtful interview questions
        <br className="hidden sm:block" /> for any role.
      </h1>

      <p className="mt-5 text-lg text-muted max-w-2xl">
        Type a job title — like{" "}
        <button
          type="button"
          onClick={() => onJobTitleChange(EXAMPLE_TITLE)}
          className="font-medium text-primary underline decoration-outline-strong underline-offset-4 hover:decoration-accent transition-colors"
        >
          {EXAMPLE_TITLE}
        </button>{" "}
        — and PrepAI returns three sharp questions a real hiring manager would ask.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-10 w-full max-w-xl flex flex-col gap-4 text-left"
      >
        <input
          id="job-title"
          name="jobTitle"
          type="text"
          value={jobTitle}
          onChange={(e) => onJobTitleChange(e.target.value)}
          placeholder={`Enter a job title (e.g. ${EXAMPLE_TITLE})`}
          aria-label="Job title"
          autoComplete="off"
          autoFocus
          maxLength={120}
          disabled={isLoading}
          className="focus-ring w-full h-12 px-4 rounded-lg border border-outline bg-card text-primary placeholder:text-muted/70 text-base shadow-sm transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center justify-center gap-2 w-full h-12 px-6 rounded-lg bg-accent text-white font-medium text-sm shadow-sm transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Spinner /> Generating…
            </>
          ) : (
            <>
              Generate interview questions
              <ArrowRight />
            </>
          )}
        </button>

        {turnstileSiteKey ? (
          <div className="flex justify-center">
            <Turnstile
              ref={turnstileRef}
              siteKey={turnstileSiteKey}
              onSuccess={onTurnstileSuccess}
              onExpire={onTurnstileExpire}
              options={{ theme: "light", size: "flexible" }}
            />
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            aria-live="polite"
            className="text-sm text-[color:var(--error)] text-center"
          >
            {error}
          </p>
        ) : null}
      </form>

      {isLoading ? (
        <div className="mt-10 w-full grid gap-4 sm:gap-6">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResultsView({
  jobTitle,
  questions,
  onReset,
}: {
  jobTitle: string;
  questions: Question[];
  onReset: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Interview questions for</p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-primary mt-1">
            {jobTitle}
          </h1>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center h-11 px-5 rounded-lg border border-outline bg-card text-primary font-medium text-sm transition-all hover:bg-[#f1f5f9] hover:border-outline-strong hover:shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
        >
          Try another role
        </button>
      </div>

      <ol className="mt-10 grid gap-4 sm:gap-6">
        {questions.map((q, idx) => (
          <li key={idx} className="ai-card p-6 sm:p-7" data-ai="true">
            <div className="flex items-center justify-between gap-4 mb-4">
              <span className={CATEGORY_CHIP[q.category]}>{q.category}</span>
              <span className="font-display text-xs font-semibold text-muted">
                {String(idx + 1).padStart(2, "0")} / 03
              </span>
            </div>
            <p className="font-display text-xl sm:text-[22px] font-semibold leading-snug text-primary">
              {q.question}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              <span className="font-medium text-primary">Why this matters: </span>
              {q.rationale}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="ai-card p-6 sm:p-7 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 w-24 rounded-full bg-outline" />
        <div className="h-4 w-12 rounded bg-outline" />
      </div>
      <div className="h-5 w-full rounded bg-outline mb-2" />
      <div className="h-5 w-4/5 rounded bg-outline mb-5" />
      <div className="h-3 w-full rounded bg-outline mb-2" />
      <div className="h-3 w-3/4 rounded bg-outline" />
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        d="M4 12a8 8 0 0 1 8-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 12h14m0 0-6-6m6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Footer() {
  return (
    <footer className="w-full border-t border-outline bg-card">
      <div className="max-w-[1280px] mx-auto px-6 sm:px-10 h-14 flex items-center justify-between text-xs text-muted">
        <span>PrepAI</span>
        <span>Questions are AI-generated. Verify before you ask in a real interview.</span>
      </div>
    </footer>
  );
}
