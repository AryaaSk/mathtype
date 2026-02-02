import type { MathLine } from "@/app/components/MathNotebook/types";

export interface TemplateMeta {
  title: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface Template {
  meta: TemplateMeta;
  lines: MathLine[];
}

export interface TemplateListItem {
  slug: string;
  meta: TemplateMeta;
}
