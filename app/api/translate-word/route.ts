import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word") ?? "";
  const sentence = request.nextUrl.searchParams.get("sentence") ?? "";

  if (!word) {
    return NextResponse.json({ error: "Missing word" }, { status: 400 });
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=de|en`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("MyMemory error");

    const data = await res.json();
    const meaning: string = data?.responseData?.translatedText ?? "";
    if (!meaning) throw new Error("Empty translation");

    return NextResponse.json({ meaning, example: sentence });
  } catch {
    return NextResponse.json({ error: "Failed to translate" }, { status: 500 });
  }
}
