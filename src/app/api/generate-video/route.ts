import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { prompt, modelId, durationSeconds, aspectRatio } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
    }
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const operation = await ai.models.generateVideos({
      model: modelId || "veo-3.0-generate-preview",
      prompt,
      config: {
        numberOfVideos: 1,
        durationSeconds: durationSeconds || 8,
        aspectRatio: aspectRatio || "16:9",
      },
    });

    return NextResponse.json({ operationName: operation.name });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
