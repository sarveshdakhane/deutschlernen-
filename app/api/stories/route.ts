import { NextResponse } from "next/server";
import { sampleStories } from "@/lib/sampleStories";

export async function GET() {
  return NextResponse.json(sampleStories);
}
