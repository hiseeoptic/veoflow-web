import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

/**
 * PHASE 1 + 2 upgrade: I2V + First/Last Frame chaining
 *
 * Phase 1: Reference image (character lock via I2V)
 * Phase 2: First frame from previous clip's last frame (seamless continuity)
 *
 * Priority order for the image seed passed to Veo:
 *   1. firstFrameImage (Phase 2) - last frame of previous clip, for seamless continuity
 *   2. referenceImage  (Phase 1) - character portrait, for identity lock
 *
 * Per Google Veo 3.1 docs: providing a starting image dramatically improves
 * character consistency. Chaining the last frame of clip N as the first frame
 * of clip N+1 creates the most seamless multi-clip narratives.
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
      firstFrameImage,
      negativePrompt,
    }: {
      prompt: string;
      modelId?: string;
      durationSeconds?: number;
      aspectRatio?: string;
      referenceImage?: string;
      firstFrameImage?: string;
      negativePrompt?: string;
    } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
    }
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    const config: any = {
      numberOfVideos: 1,
      durationSeconds: durationSeconds || 8,
      aspectRatio: aspectRatio || "16:9",
    };

    if (negativePrompt && negativePrompt.trim()) {
      config.negativePrompt = negativePrompt.trim();
    }

    const payload: any = {
      model: modelId || "veo-3.0-generate-preview",
      prompt,
      config,
    };

    // PHASE 2 has priority: first frame from previous clip's last frame
    // PHASE 1 fallback: character reference image
    const seedImage = firstFrameImage || referenceImage;
    if (seedImage && seedImage.trim()) {
      const { data, mimeType } = stripDataUrl(seedImage);
      payload.image = {
        imageBytes: data,
        mimeType,
      };
    }

    const operation = await ai.models.generateVideos(payload);

    return NextResponse.json({
      operationName: operation.name,
      seedSource: firstFrameImage ? "first_frame_chained" : referenceImage ? "character_reference" : "none",
    });
  } catch (error: any) {
    console.error("Veo generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
