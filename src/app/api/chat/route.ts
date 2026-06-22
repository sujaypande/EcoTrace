import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
import { Embeddings } from "@langchain/core/embeddings";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import {
  JsonOutputParser,
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import {
  RunnableLambda,
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGeminiApiKey, getGeminiModel, getGeminiModelCandidates } from "@/lib/gemini";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatRequestBody = {
  message?: unknown;
  conversationHistory?: unknown;
};

type RagInput = {
  question: string;
  history: ChatMessage[];
};

type RetrievedContext = {
  context: string;
  sources: string[];
};

const answerSchema = z.object({
  answer: z
    .string()
    .describe("A concise, helpful answer for the user in plain text."),
  followUp: z
    .string()
    .describe("One short suggested follow-up question the user could ask."),
  usedSources: z
    .array(z.string())
    .describe("Knowledge base source titles used to answer."),
});

type StructuredAnswer = z.infer<typeof answerSchema>;

const knowledgeBase = [
  {
    title: "Waste types",
    content:
      "Electronic waste, or e-waste, includes discarded electrical or electronic devices. Accepted categories include batteries, CRT televisions, laptops, monitors, printers, mobile phones, light bulbs, printed circuit boards, chargers, cables, and other small electronic accessories.",
  },
  {
    title: "Collection process",
    content:
      "Users report waste through the report page, add location and waste details, and upload an image for verification. Collectors browse available reports, accept pickup tasks, collect the matching waste, and submit completion details. The platform verifies the collected item against the report before rewards are finalized.",
  },
  {
    title: "Rewards system",
    content:
      "Users earn tokens for reporting verified e-waste, usually 10 to 50 tokens per report. Collectors earn tokens for completed pickup tasks. Tokens can be redeemed for discounts and purchases. Reward points also contribute to leaderboard rankings.",
  },
  {
    title: "Environmental impact",
    content:
      "Responsible e-waste recycling recovers valuable materials such as gold, copper, aluminum, lithium, and rare earth elements. It prevents toxic substances from entering soil and water, reduces raw material extraction, and saves energy compared with manufacturing devices from virgin materials.",
  },
  {
    title: "Services",
    content:
      "The platform supports door-to-door waste collection, secure device data destruction, spare parts recycling, green business disposal for organizations, recycling partner discovery, tracking, and Extended Producer Responsibility registration services.",
  },
  {
    title: "Getting started",
    content:
      "A new user should create an account, verify email, log in to the dashboard, report waste items, upload photos for verification, and track rewards or pickup progress through the dashboard, leaderboard, and tracking pages.",
  },
  {
    title: "Pricing and bulk collection",
    content:
      "Typical household e-waste reports range from 5 to 20 kilograms. Verified collections earn at least 10 tokens. Bulk collections of 50 kilograms or more are prioritized for business or large household pickups.",
  },
  {
    title: "Data destruction",
    content:
      "Secure data destruction is available for phones, laptops, drives, and other storage devices. Sensitive data should be erased before recycling or resale to protect user privacy.",
  },
  {
    title: "EPR support",
    content:
      "Extended Producer Responsibility, or EPR, helps producers manage their products at end of life. The platform supports companies with EPR registration and waste disposal compliance workflows.",
  },
];

const fallbackResponses: Record<string, string> = {
  "what is e-waste":
    "E-waste is discarded electrical or electronic equipment, such as phones, laptops, monitors, printers, batteries, bulbs, and circuit boards. This platform helps users report, collect, verify, and recycle those items responsibly.",
  "how does the platform work":
    "Report your e-waste with photos, wait for a collector to pick it up, and earn rewards once the collection is verified. Collectors can also accept pickup tasks and earn tokens for completed collections.",
  "how do i earn rewards":
    "You earn tokens by reporting verified e-waste or by completing collection tasks as a collector. Tokens can be used for discounts, purchases, and leaderboard progress.",
  "what waste types are accepted":
    "Accepted waste includes batteries, CRT TVs, laptops, monitors, printers, mobile phones, light bulbs, printed circuit boards, chargers, cables, and other electronic accessories.",
  "is data destruction available":
    "Yes. The platform includes secure data destruction services so sensitive device data can be erased before recycling.",
  "how can i become a collector":
    "Create an account, verify your email, and use the collection flow to browse available pickup tasks. Completed and verified tasks earn collector rewards.",
  "what is epr registration":
    "EPR, or Extended Producer Responsibility, helps producers manage their products at end of life. The platform supports companies with EPR registration and related obligations.",
};

class HashEmbeddings extends Embeddings {
  private readonly dimensions = 256;

  constructor() {
    super({});
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return documents.map((document) => this.embedText(document));
  }

  async embedQuery(document: string): Promise<number[]> {
    return this.embedText(document);
  }

  private embedText(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2);

    for (const token of tokens) {
      vector[this.hash(token) % this.dimensions] += 1;
    }

    const magnitude = Math.sqrt(
      vector.reduce((total, value) => total + value * value, 0)
    );

    return magnitude > 0 ? vector.map((value) => value / magnitude) : vector;
  }

  private hash(value: string): number {
    let hash = 0;

    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }

    return hash;
  }
}

let vectorStorePromise: Promise<MemoryVectorStore> | null = null;

function parseHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is ChatMessage => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const maybeMessage = item as Partial<ChatMessage>;
      return (
        (maybeMessage.role === "user" || maybeMessage.role === "assistant") &&
        typeof maybeMessage.content === "string"
      );
    })
    .slice(-8);
}

function formatHistory(history: ChatMessage[]): string {
  if (history.length === 0) {
    return "No previous conversation.";
  }

  return history
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`
    )
    .join("\n");
}

function formatDocuments(documents: Document[]): RetrievedContext {
  const sources = Array.from(
    new Set(
      documents
        .map((document) => String(document.metadata.title ?? "Knowledge base"))
        .filter(Boolean)
    )
  );

  return {
    sources,
    context: documents
      .map((document, index) => {
        const title = String(document.metadata.title ?? `Source ${index + 1}`);
        return `[${index + 1}] ${title}\n${document.pageContent}`;
      })
      .join("\n\n"),
  };
}

async function getVectorStore(): Promise<MemoryVectorStore> {
  if (!vectorStorePromise) {
    vectorStorePromise = (async () => {
      const rawDocuments = knowledgeBase.map(
        (entry) =>
          new Document({
            pageContent: `${entry.title}\n${entry.content}`,
            metadata: { title: entry.title },
          })
      );

      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 450,
        chunkOverlap: 80,
      });
      const splitDocuments = await splitter.splitDocuments(rawDocuments);

      return MemoryVectorStore.fromDocuments(
        splitDocuments,
        new HashEmbeddings()
      );
    })();
  }

  return vectorStorePromise;
}

async function retrieveKnowledge(question: string): Promise<RetrievedContext> {
  const vectorStore = await getVectorStore();
  const retriever = vectorStore.asRetriever({ k: 5 });
  const documents = await retriever.invoke(question);
  return formatDocuments(documents);
}

const retrieveKnowledgeTool = tool(
  async ({ question }: { question: string }) => {
    const retrieved = await retrieveKnowledge(question);
    return JSON.stringify(retrieved);
  },
  {
    name: "retrieve_e_waste_knowledge",
    description:
      "Use this tool before answering e-waste platform questions. It retrieves relevant chunks from the platform knowledge base.",
    schema: z.object({
      question: z.string().describe("The user's current question."),
    }),
  }
);

const toolCallingPlannerPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a tool-calling planner. Decide whether to retrieve platform knowledge before answering. Return JSON only.",
  ],
  [
    "human",
    "Question: {question}\nRecent conversation:\n{history}\nAvailable tool: retrieve_e_waste_knowledge",
  ],
]);

const toolCallingPlannerParser = new JsonOutputParser<{
  tool: "retrieve_e_waste_knowledge";
  reason: string;
}>();

function buildToolCallingPlannerChain(apiKey?: string) {
  if (!apiKey) {
    return RunnableLambda.from(() => ({
      tool: "retrieve_e_waste_knowledge" as const,
      reason: "RAG context is required for grounded platform answers.",
    }));
  }

  return RunnableSequence.from([
    toolCallingPlannerPrompt,
    new ChatGoogleGenerativeAI({
      apiKey,
      model: getGeminiModel(),
      temperature: 0,
    }),
    toolCallingPlannerParser,
  ]).withFallbacks({
    fallbacks: [
      RunnableLambda.from(() => ({
        tool: "retrieve_e_waste_knowledge" as const,
        reason: "RAG context is required for grounded platform answers.",
      })),
    ],
  });
}

function getFallbackResponse(message: string, retrieved: RetrievedContext): string {
  const normalizedMessage = message.toLowerCase();
  const matchedKey = Object.keys(fallbackResponses).find((key) =>
    normalizedMessage.includes(key)
  );

  if (matchedKey) {
    return fallbackResponses[matchedKey];
  }

  return `Based on the e-waste management knowledge base:\n\n${retrieved.context}\n\nAsk me about waste reporting, accepted items, collector rewards, data destruction, business disposal, or EPR services.`;
}

async function buildFallbackChain() {
  const prompt = PromptTemplate.fromTemplate(
    `Use the retrieved context to answer the user without an external model.

Question:
{question}

Context:
{context}`
  );

  return RunnableSequence.from([
    RunnablePassthrough.assign({
      context: (input: RagInput & RetrievedContext) => input.context,
    }),
    prompt,
    new StringOutputParser(),
  ]);
}

function buildAnswerChain(apiKey: string, modelName: string) {
  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: modelName,
    temperature: 0.3,
    maxOutputTokens: 650,
  });

  const structuredModel = model.withStructuredOutput(answerSchema, {
    name: "greenbot_answer",
    method: "jsonSchema",
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are EcoTrace Assistant, the AI guide for the EcoTrace e-waste collection and recycling platform.

Answer only from the retrieved context when possible.
If the question is unrelated to e-waste management, politely redirect to waste collection, rewards, recycling, data destruction, business disposal, tracking, or EPR.
Keep the answer concise and practical.
Use the structured response schema.`,
    ],
    [
      "human",
      `Question:
{question}

Recent conversation:
{history}

Retrieved context:
{context}

Source titles:
{sources}`,
    ],
  ]);

  const structuredParser = StructuredOutputParser.fromZodSchema(answerSchema);

  return RunnableSequence.from([
    RunnablePassthrough.assign({
      history: (input: RagInput & RetrievedContext) =>
        formatHistory(input.history),
      sources: (input: RagInput & RetrievedContext) =>
        input.sources.length > 0 ? input.sources.join(", ") : "Knowledge base",
    }),
    prompt,
    structuredModel,
    RunnableLambda.from(async (output: StructuredAnswer | string) => {
      if (typeof output !== "string") {
        return output;
      }

      return structuredParser.parse(output);
    }),
  ]);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const question = typeof body.message === "string" ? body.message.trim() : "";

    if (!question) {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    const history = parseHistory(body.conversationHistory);
    const apiKey = getGeminiApiKey();

    const retrievedJson = await retrieveKnowledgeTool.invoke({ question });
    const retrieved = JSON.parse(String(retrievedJson)) as RetrievedContext;

    if (!apiKey) {
      return NextResponse.json({
        role: "assistant",
        content: getFallbackResponse(question, retrieved),
      });
    }

    try {
      let answer: StructuredAnswer | null = null;
      let lastModelError: unknown;

      for (const modelName of getGeminiModelCandidates()) {
        try {
          const answerChain = buildAnswerChain(apiKey, modelName);
          answer = await Promise.race([
            answerChain.invoke({
              question,
              history,
              ...retrieved,
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Chat model timeout")), 15000)
            ),
          ]);
          break;
        } catch (modelError) {
          lastModelError = modelError;
          const status =
            typeof modelError === "object" &&
            modelError !== null &&
            "status" in modelError
              ? (modelError as { status: number }).status
              : undefined;
          if (status === 429) {
            console.warn(`Chat quota hit for ${modelName}, trying next model...`);
            continue;
          }
          throw modelError;
        }
      }

      if (!answer) {
        throw lastModelError ?? new Error("All Gemini models unavailable");
      }

      const content = [answer.answer, `\nSuggested follow-up: ${answer.followUp}`]
        .filter(Boolean)
        .join("\n");

      return NextResponse.json({
        role: "assistant",
        content,
      });
    } catch (modelError) {
      console.error("Chat model error, using fallback:", modelError);
      return NextResponse.json({
        role: "assistant",
        content: getFallbackResponse(question, retrieved),
      });
    }
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
