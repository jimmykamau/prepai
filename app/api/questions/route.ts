import { NextResponse, type NextRequest } from "next/server";
import { JobTitleInput } from "@/lib/schema";
import { generateInterviewQuestions } from "@/lib/ai";
import { verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  jobTitle?: unknown;
  turnstileToken?: unknown;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = JobTitleInput.safeParse(body.jobTitle);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid job title" },
      { status: 400 },
    );
  }

  const token = typeof body.turnstileToken === "string" ? body.turnstileToken : undefined;
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;

  const captcha = await verifyTurnstile(token, ip);
  if (!captcha.ok) {
    return NextResponse.json(
      { error: "Captcha verification failed", code: captcha.reason },
      { status: 403 },
    );
  }

  try {
    const payload = await generateInterviewQuestions(parsed.data);
    return NextResponse.json(payload, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/questions] generation failed:", message);
    return NextResponse.json(
      { error: "Could not generate questions. Please try again." },
      { status: 502 },
    );
  }
}
