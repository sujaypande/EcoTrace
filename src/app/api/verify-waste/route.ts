import { NextRequest, NextResponse } from "next/server";
import {
  generateGeminiContent,
  getGeminiApiKey,
  parseGeminiJson,
} from "@/lib/gemini";

type VerifyMode = "report" | "collect";

type VerifyRequestBody = {
  mode: VerifyMode;
  imageData: string;
  mimeType: string;
  wasteType?: string;
  amount?: string;
};

const REPORT_PROMPT = `You are an expert in waste management and recycling. Analyze this image and provide:

1.The type of E-waste present(eg. 'Battery', 'Cable', 'CRT TV', 'E Kettle', 'Fridge',
  'Keyboard', 'Laptop', 'Light Bulb', 'Monitor', 'Mouse',
  'PCB', 'Phone', 'Printer', 'Rice Cooker', 'Washing Machine')        2. An estimate of the quantity or amount (in kg or liters)
of e waste and other waste.        3. Your confidence level in this assessment (as a percentage)
      4.predict the price of the e waste before seling it to the recycler
      Respond in JSON format like this:
      {
        "wasteType": "type of waste",
        "quantity": "estimated quantity with unit",
        "confidence": "confidence level as a number between 0 and 1",
         "estimatedPrice": predicted price before selling to recycler
      }`;

function buildCollectPrompt(wasteType: string, amount: string) {
  return `You are an expert in waste management and recycling. Analyze this image and provide:
  1. Confirm if the waste type matches: ${wasteType}
  2. Estimate if the quantity matches: ${amount}
  3. Your confidence level in this assessment (as a percentage)

  Respond in JSON format like this:
  {
    "wasteTypeMatch": true/false,
    "quantityMatch": true/false,
    "confidence": confidence level as a number between 0 and 1
  }`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as VerifyRequestBody;
    const { mode, imageData, mimeType } = body;

    if (!mode || !imageData || !mimeType) {
      return NextResponse.json(
        { error: "mode, imageData, and mimeType are required" },
        { status: 400 }
      );
    }

    if (mode === "collect" && (!body.wasteType || !body.amount)) {
      return NextResponse.json(
        { error: "wasteType and amount are required for collect verification" },
        { status: 400 }
      );
    }

    const base64Data = imageData.includes(",")
      ? imageData.split(",")[1]
      : imageData;

    const prompt =
      mode === "report"
        ? REPORT_PROMPT
        : buildCollectPrompt(body.wasteType!, body.amount!);

    const result = await generateGeminiContent(apiKey, [
      { text: prompt },
      {
        inlineData: {
          data: base64Data,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();

    if (mode === "report") {
      const parsed = parseGeminiJson<{
        wasteType?: string;
        quantity?: string;
        confidence?: number;
        estimatedPrice?: number | string;
      }>(text);

      if (!parsed.wasteType || !parsed.quantity || parsed.confidence == null) {
        return NextResponse.json(
          { error: "Invalid verification result from AI" },
          { status: 422 }
        );
      }

      return NextResponse.json({
        wasteType: parsed.wasteType,
        quantity: parsed.quantity,
        confidence: Number(parsed.confidence),
        estimatedPrice: parsed.estimatedPrice,
      });
    }

    const parsed = parseGeminiJson<{
      wasteTypeMatch?: boolean;
      quantityMatch?: boolean;
      confidence?: number;
    }>(text);

    if (
      parsed.wasteTypeMatch == null ||
      parsed.quantityMatch == null ||
      parsed.confidence == null
    ) {
      return NextResponse.json(
        { error: "Invalid verification result from AI" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      wasteTypeMatch: parsed.wasteTypeMatch,
      quantityMatch: parsed.quantityMatch,
      confidence: Number(parsed.confidence),
    });
  } catch (error) {
    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      (error as { status: number }).status === 429
        ? 429
        : 500;

    console.error("Verify waste API error:", error);
    return NextResponse.json(
      {
        error:
          status === 429
            ? "Gemini API quota exceeded. Please retry in a minute."
            : "Failed to verify waste image",
      },
      { status }
    );
  }
}
