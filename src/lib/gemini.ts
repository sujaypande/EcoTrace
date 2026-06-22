import {
  GenerateContentResult,
  GoogleGenerativeAI,
  Part,
} from "@google/generative-ai";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

const MODEL_FALLBACKS = [
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
];

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY
  );
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL;
}

export function getGeminiModelCandidates(): string[] {
  const preferred = getGeminiModel();
  return Array.from(new Set([preferred, ...MODEL_FALLBACKS]));
}

function isQuotaError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === 429
  );
}

export async function generateGeminiContent(
  apiKey: string,
  parts: Part[]
): Promise<GenerateContentResult> {
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError: unknown;

  for (const modelName of getGeminiModelCandidates()) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await model.generateContent(parts);
    } catch (error) {
      lastError = error;
      if (!isQuotaError(error)) {
        throw error;
      }
      console.warn(`Gemini quota hit for ${modelName}, trying next model...`);
    }
  }

  throw lastError;
}

export function parseGeminiJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}
