import { NextRequest, NextResponse } from "next/server";
import { generateStory } from "@/lib/claude";

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic") ?? undefined;

  try {
    const story = await generateStory(topic);
    story.date = new Date().toISOString().split("T")[0];
    return NextResponse.json(story);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate story";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
