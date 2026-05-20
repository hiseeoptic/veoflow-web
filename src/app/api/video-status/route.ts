import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function GET(req: NextRequest) {
  try {
    const operationName = req.nextUrl.searchParams.get("operation");

    if (!operationName) {
      return NextResponse.json({ error: "operation parameter is required." }, { status: 400 });
    }
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operation = await ai.operations.getVideosOperation({
      operation: { name: operationName } as any,
    });

    if (operation.done) {
      const videos = operation.response?.generatedVideos;
      const videoUri = videos?.[0]?.video?.uri;

      if (!videoUri) {
        return NextResponse.json({ done: true, error: "No video URI returned." });
      }

      return NextResponse.json({ done: true, videoUri });
    }

    return NextResponse.json({ done: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
