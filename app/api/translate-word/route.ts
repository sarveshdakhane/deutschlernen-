import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get("word") ?? "";

  if (!word) {
    return NextResponse.json({ error: "Missing word" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=de|en`
    );
    if (!res.ok) throw new Error("MyMemory error");
    const data = await res.json();
    const meaning: string = data?.responseData?.translatedText ?? "";
    if (!meaning) throw new Error("Empty translation");
    return NextResponse.json({ meaning });
  } catch {
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
