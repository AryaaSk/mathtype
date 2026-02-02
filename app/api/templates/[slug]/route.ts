import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const filePath = path.join(
    process.cwd(),
    "public",
    "templates",
    `${slug}.json`
  );

  try {
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}
