import { NextRequest, NextResponse } from "next/server";
import { getSampleStoryBySlug } from "@/lib/sampleStories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const story = getSampleStoryBySlug(slug);

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return NextResponse.json(story);
}
