import { NextRequest, NextResponse } from "next/server";
import { readVocab, writeVocab } from "@/lib/vocabStorage.server";

export async function GET() {
  const items = readVocab();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  const item = await request.json();
  if (!item?.word) {
    return NextResponse.json({ error: "Missing word" }, { status: 400 });
  }
  const items = readVocab();
  const exists = items.some((v) => v.word.toLowerCase() === item.word.toLowerCase());
  if (!exists) {
    items.push(item);
    writeVocab(items);
  }
  return NextResponse.json({ ok: true, duplicate: exists });
}

export async function DELETE(request: NextRequest) {
  const { word } = await request.json();
  if (!word) {
    return NextResponse.json({ error: "Missing word" }, { status: 400 });
  }
  const items = readVocab().filter(
    (v) => v.word.toLowerCase() !== word.toLowerCase()
  );
  writeVocab(items);
  return NextResponse.json({ ok: true });
}
