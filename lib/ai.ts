import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, type LanguageModel } from "ai";
import { QuestionsSchema, type QuestionsPayload } from "./schema";
import { ConfigurationError } from "./errors";

type Provider = "openrouter" | "google";

const DEFAULT_MODELS: Record<Provider, string> = {
  openrouter: "anthropic/claude-sonnet-4.5",
  google: "gemini-2.5-flash",
};

const SYSTEM_PROMPT = `You are a seasoned hiring manager who has interviewed hundreds of candidates across many industries.

When given a job title, produce exactly three interview questions that genuinely separate strong candidates from weak ones for that specific role. Avoid generic prompts like "tell me about yourself" or "what is your greatest weakness". Each question should probe a competency or trade-off that matters specifically for the role.

For each question, return:
- "question": the question itself, phrased as you would ask it in the room.
- "category": one of "Behavioral", "Situational", "Technical", "Strategic", "Cultural".
- "rationale": one sentence (≤ 280 chars) explaining what a strong answer reveals about the candidate.

Vary the categories across the three questions when possible. Keep each question under 400 characters.`;

function resolveProvider(): Provider {
  const raw = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (raw === "google") return "google";
  if (raw === "openrouter" || !raw) return "openrouter";
  throw new ConfigurationError(
    `Unknown AI_PROVIDER "${raw}". Use "openrouter" or "google".`,
  );
}

function buildModel(provider: Provider): LanguageModel {
  if (provider === "google") {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new ConfigurationError(
        "GOOGLE_GENERATIVE_AI_API_KEY is not set (required when AI_PROVIDER=google)",
      );
    }
    const google = createGoogleGenerativeAI({ apiKey });
    const modelId = process.env.GOOGLE_MODEL?.trim() || DEFAULT_MODELS.google;
    return google(modelId);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ConfigurationError("OPENROUTER_API_KEY is not set");
  }
  const openrouter = createOpenRouter({ apiKey });
  const modelId = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODELS.openrouter;
  return openrouter(modelId);
}

export async function generateInterviewQuestions(
  jobTitle: string,
): Promise<QuestionsPayload> {
  const provider = resolveProvider();
  const model = buildModel(provider);

  const { object } = await generateObject({
    model,
    schema: QuestionsSchema,
    system: SYSTEM_PROMPT,
    prompt: `Job title: ${jobTitle}\n\nReturn the three best interview questions for this role.`,
    temperature: 0.7,
  });

  return object;
}
