import { NextRequest, NextResponse } from "next/server";

// Proxy for downloading Veo-generated videos so the API key stays server-side
export async function GET(req: NextRequest) {
  try {
    const uri = req.nextUrl.searchParams.get("uri");
    const filename = req.nextUrl.searchParams.get("filename") || "veo_video.mp4";
    // PHASE 2: inline=1 serves as video stream (for canvas frame extraction)
    const inline = req.nextUrl.searchParams.get("inline") === "1";

    if (!uri) {
      return NextResponse.json({ error: "uri parameter is required." }, { status: 400 });
    }
    if (!process.env.GOOGLE_API_KEY) {
      return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
    }

    const fetchUrl = uri.includes("?")
      ? `${uri}&key=${process.env.GOOGLE_API_KEY}`
      : `${uri}?key=${process.env.GOOGLE_API_KEY}`;

    const videoResp = await fetch(fetchUrl, {
      headers: { "X-Goog-Api-Key": process.env.GOOGLE_API_KEY },
    });

    if (!videoResp.ok) {
      return NextResponse.json({ error: `Failed to fetch video: ${videoResp.status}` }, { status: 502 });
    }

    const headers: Record<string, string> = {
      "Content-Type": videoResp.headers.get("Content-Type") || "video/mp4",
      "Cache-Control": "no-store",
    };

    if (inline) {
      // PHASE 2: stream inline so client video element can decode for frame capture
      headers["Content-Disposition"] = "inline";
      // Allow same-origin canvas access (no CORS taint)
      headers["Access-Control-Allow-Origin"] = "*";
    } else {
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(videoResp.body, { headers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
