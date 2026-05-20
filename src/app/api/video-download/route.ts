import { NextRequest, NextResponse } from "next/server";

// Proxy for downloading Veo-generated videos so the API key stays server-side
export async function GET(req: NextRequest) {
  try {
    const uri = req.nextUrl.searchParams.get("uri");
    const filename = req.nextUrl.searchParams.get("filename") || "veo_video.mp4";

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

    return new NextResponse(videoResp.body, {
      headers: {
        "Content-Type": videoResp.headers.get("Content-Type") || "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
