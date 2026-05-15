import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function splitScenesBySeparator(script: string): string[] {
  const cleanScript = script.replace(/\r\n/g, '\n').trim();
  const separatorLineRegex = /\n\s*[-=_*]+\s*\n/g;
  const bySeparator = cleanScript.split(separatorLineRegex).map(s => s.trim()).filter(s => s.length > 0);
  if (bySeparator.length > 1) return bySeparator;

  const headerRegex = /\n+(?=\s*(?:Scene|Clip|Shot|Seq)\s*\d+)/i;
  const byHeader = cleanScript.split(headerRegex).map(s => s.trim()).filter(s => s.length > 0);
  if (byHeader.length > 1) return byHeader;

  const byParagraph = cleanScript.split(/\n\s*\n/g).map(s => s.trim()).filter(s => s.length > 0);
  if (byParagraph.length > 1) return byParagraph;

  return [cleanScript];
}

export async function POST(req: NextRequest) {
  try {
    const { project } = await req.json();
    const sceneBlocks = splitScenesBySeparator(project.script);

    if (sceneBlocks.length === 0) {
      return NextResponse.json({ error: "No scenes detected in script." }, { status: 400 });
    }

    const BATCH_SIZE = 5;
    let allParsedSegments: any[] = [];

    for (let i = 0; i < sceneBlocks.length; i += BATCH_SIZE) {
      const chunk = sceneBlocks.slice(i, i + BATCH_SIZE);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        max_tokens: 8192,
        messages: [
          {
            role: "system",
            content: `ROLE: Scene Block Mapper. Each input block = EXACTLY ONE 8s SCENE.
Output a JSON object with key "segments" containing an array of objects, each with: scriptSegment (string), actionSummary (string), characterId (string).`
          },
          {
            role: "user",
            content: `[CHARACTERS_DB] ${JSON.stringify(project.characters.map((c: any) => ({ id: c.id, name: c.name })))}
[SCENE_BLOCKS_BATCH_START_INDEX_${i}] ${JSON.stringify(chunk)}`
          }
        ]
      });

      const text = response.choices[0]?.message?.content || '{"segments":[]}';
      const parsed = JSON.parse(text);
      const segments = Array.isArray(parsed.segments) ? parsed.segments : Array.isArray(parsed) ? parsed : [];
      allParsedSegments.push(...(segments.length > 0 ? segments : chunk.map(txt => ({ scriptSegment: txt, actionSummary: "Scene block", characterId: "unknown" }))));
    }

    const clips = allParsedSegments.map((seg: any, index: number) => ({
      id: `clip-${Date.now()}-${index}`,
      sequence: index + 1,
      scriptSegment: seg.scriptSegment || sceneBlocks[index] || "",
      actionSummary: seg.actionSummary || "No action summary",
      characterId: seg.characterId || "unknown",
      status: "pending",
      duration: 8,
      flattenedPrompt: "",
      final_json_output: null
    }));

    return NextResponse.json({ clips, sceneCount: sceneBlocks.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
