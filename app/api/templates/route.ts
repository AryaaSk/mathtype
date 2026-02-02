import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { TemplateListItem, Template } from "@/app/lib/templates/types";

export async function GET() {
  const templatesDir = path.join(process.cwd(), "public", "templates");

  try {
    const files = await fs.readdir(templatesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const templates: TemplateListItem[] = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filePath = path.join(templatesDir, filename);
        const content = await fs.readFile(filePath, "utf-8");
        const data: Template = JSON.parse(content);
        const slug = filename.replace(".json", "");

        return {
          slug,
          meta: data.meta,
        };
      })
    );

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Failed to read templates:", error);
    return NextResponse.json({ templates: [] });
  }
}
