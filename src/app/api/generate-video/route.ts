import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * Phase 1 upgrade: Image-to-Video (I2V) support
 *
 * Per Google's official Veo 3 guide:
 * > "Image-to-Video (I2V) is the BEST modality for character consistency
 * >  across multiple clips. If you need the same character in different scenes,
 * >  start each generation with the same reference image."
 *
 * This route now accepts an optional `referenceImage` (base64 data URL or raw base64)
 * and forwards it to Veo as the seed image. This dramatically reduces character
 * drift across long-form videos (5-10 min, 40+ clips).
 */

function stripDataUrl(b64: string): { data: string; mimeType: string } {
  if (b64.startsWith("data:")) {
    const match = b64.match(/^data:(.+?);base64,(.+)$/);
    if (match) {
      return { mimeType: match[1], data: match[2] };
    }
  }
  return { mimeType: "image/jpeg", data: b64 };
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      modelId,
      durationSeconds,
      aspectRatio,
      referenceImage,
      negativePrompt,
    }: {
      prompt: string;
      modelId?: string;
      durationSeconds?: number;
      aspectRatio?: string;
      referenceImage?: string;
      negativePrompt?: string;
    } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
    }
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    // Build config with optional negative prompt
    const config: any = {
      numberOfVideos: 1,
      durationSeconds: durationSeconds || 8,
      aspectRatio: aspectRatio || "16:9",
    };

    if (negativePrompt && negativePrompt.trim()) {
      config.negativePrompt = negativePrompt.trim();
    }

    // Build request payload
    const payload: any = {
      model: modelId || "veo-3.0-generate-preview",
      prompt,
      config,
    };

    // Phase 1: Attach reference image for I2V (character consistency)
    if (referenceImage && referenceImage.trim()) {
      const { data, mimeType } = stripDataUrl(referenceImage);
      payload.image = {
        imageBytes: data,
        mimeType,
      };
    }

    const operation = await ai.models.generateVideos(payload);

    return NextResponse.json({ operationName: operation.name });
  } catch (error: any) {
    console.error("Veo generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
