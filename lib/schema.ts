import { z } from "zod";

export const QuestionCategory = z.enum([
  "Behavioral",
  "Situational",
  "Technical",
  "Strategic",
  "Cultural",
]);

export const QuestionSchema = z.object({
  question: z.string().min(15).max(400),
  category: QuestionCategory,
  rationale: z.string().min(20).max(280),
});

export const QuestionsSchema = z.object({
  questions: z.array(QuestionSchema).length(3),
});

export type Question = z.infer<typeof QuestionSchema>;
export type QuestionsPayload = z.infer<typeof QuestionsSchema>;

export const JobTitleInput = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters.")
  .max(120, "Keep it under 120 characters.");
