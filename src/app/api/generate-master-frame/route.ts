import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Character } from "@/lib/types";

/**
 * PHASE 3: Green Screen Master Frame Generation
 *
 * Generates a single authoritative portrait of a character on plain green/neutral
 * background using Gemini 2.5 Flash Image. This master frame becomes the
 * universal identity anchor for I2V across ALL scenes in the video.
 *
 * Per Nahian Bin Rahman's research (medium.com): "Green screen characters
 * serve as the base for every single shot, guaranteeing consistency."
 *
 * Workflow:
 *   1. User uploads optional reference photo (helps but not required)
 *   2. We compose a detailed forensic prompt from all 5 DNA fields
 *   3. Gemini Image generates a high-fidelity portrait on green screen
 *   4. We return the base64 PNG which gets stored as character.masterFrameBase64
 *   5. Veo uses this as the first frame for EVERY clip with this character
 */

export const maxDuration = 120;

function buildCharacterPrompt(c: Character): string {
  const parts: string[] = [];

  parts.push(
    `Professional studio portrait of ${c.name}, ${c.gender}, age ${c.age_group}.`
  );
  if (c.face_features) parts.push(`Face: ${c.face_features}.`);
  if (c.eye_details) parts.push(`Eyes: ${c.eye_details}.`);
  if (c.skin_texture) parts.push(`Skin texture: ${c.skin_texture}.`);
  if (c.hair) parts.push(`Hair: ${c.hair}.`);
  if (c.clothing) parts.push(`Wearing: ${c.clothing}.`);
  if (c.accessories) parts.push(`Accessories (must all be visible): ${c.accessories}.`);
  if (c.gait_posture) parts.push(`Posture: ${c.gait_posture}.`);

  // Green screen technical spec
  parts.push(
    "Background: SOLID CHROMA-KEY GREEN (#00B140), uniformly lit, no shadows on background, no objects in background."
  );
  parts.push(
    "Framing: medium full-body shot, character centered, facing camera at slight 3/4 angle, neutral confident expression, looking slightly off-camera."
  );
  parts.push(
    "Lighting: balanced 3-point studio lighting on character - soft key from camera left 4200K, fill from right, rim light separating from green background."
  );
  parts.push(
    "Style: photorealistic professional photography, sharp focus on face, 85mm portrait lens, f/2.8, no motion blur, high resolution."
  );
  parts.push(
    "NEGATIVE: no text, no watermark, no other people, no background objects, no shadow on background, no graphic overlay, no border."
  );

  return parts.join(" ");
}

export async function POST(req: NextRequest) {
  try {
    const { character, referenceImageBase64 } = await req.json();

    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
    }

    if (!character || !character.name) {
      return NextResponse.json({ error: "character with name is required." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    const prompt = buildCharacterPrompt(character as Character);

    // Build contents array; if reference image provided, include it
    const parts: any[] = [{ text: prompt }];
    if (referenceImageBase64) {
      const stripped = referenceImageBase64.startsWith("data:")
        ? referenceImageBase64.split(",")[1] || referenceImageBase64
        : referenceImageBase64;
      const mimeMatch = referenceImageBase64.match(/^data:(.+?);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      parts.push({
        inlineData: {
          mimeType,
          data: stripped,
        },
      });
      parts.push({
        text: "USE the provided reference photo for facial identity. Match the exact face features, but place character on chroma-key green background as described above.",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: parts,
    });

    // Extract image from response
    const candidates = response.candidates;
    let imageBase64: string | null = null;
    let imageMime = "image/png";

    if (candidates && candidates.length > 0) {
      const partsResp = candidates[0]?.content?.parts || [];
      for (const p of partsResp) {
        if ((p as any).inlineData?.data) {
          imageBase64 = (p as any).inlineData.data;
          imageMime = (p as any).inlineData.mimeType || imageMime;
          break;
        }
      }
    }

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image generation returned no image. Try refining character DNA fields." },
        { status: 502 }
      );
    }

    const dataUrl = `data:${imageMime};base64,${imageBase64}`;

    return NextResponse.json({
      masterFrameBase64: dataUrl,
      generatedAt: Date.now(),
      promptUsed: prompt,
    });
  } catch (error: any) {
    console.error("Master frame generation error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
