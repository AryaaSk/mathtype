import Link from "next/link";
import type { TemplateListItem } from "@/app/lib/templates/types";
import fs from "fs/promises";
import path from "path";

async function getTemplates(): Promise<TemplateListItem[]> {
  const templatesDir = path.join(process.cwd(), "public", "templates");

  try {
    const files = await fs.readdir(templatesDir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    const templates = await Promise.all(
      jsonFiles.map(async (filename) => {
        const filePath = path.join(templatesDir, filename);
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content);
        const slug = filename.replace(".json", "");

        return { slug, meta: data.meta };
      })
    );

    return templates;
  } catch {
    return [];
  }
}

const difficultyStyles: Record<string, { bg: string; text: string }> = {
  Beginner: { bg: "#ecfdf5", text: "#059669" },
  Intermediate: { bg: "#fffbeb", text: "#d97706" },
  Advanced: { bg: "#fef2f2", text: "#dc2626" },
};

export async function TemplateGrid() {
  const templates = await getTemplates();

  if (templates.length === 0) {
    return (
      <div className="template-empty">
        <p>No templates available yet.</p>
        <p>Create your own notebook to get started.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .template-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }

        @media (max-width: 800px) {
          .template-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 500px) {
          .template-grid {
            grid-template-columns: 1fr;
          }
        }

        .template-card {
          display: block;
          padding: 16px;
          background: white;
          border: 1px solid #e5e4e0;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .template-card:hover {
          border-color: #d5d4d0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .template-card:hover .template-title {
          color: #7c3aed;
        }

        .template-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .template-category {
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #9a9a96;
        }

        .template-difficulty {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 3px;
        }

        .template-title {
          font-family: var(--landing-font-display);
          font-size: 16px;
          font-weight: 600;
          color: #1a1a18;
          margin: 0 0 4px;
          transition: color 0.15s ease;
        }

        .template-desc {
          font-size: 13px;
          line-height: 1.4;
          color: #6b6b68;
          margin: 0;
        }

        .template-empty {
          text-align: center;
          padding: 32px 20px;
          color: #9a9a96;
          font-size: 14px;
        }

        .template-empty p {
          margin: 4px 0;
        }
      `}</style>

      <div className="template-grid">
        {templates.map((template) => {
          const difficulty = difficultyStyles[template.meta.difficulty] || {
            bg: "#f5f4f0",
            text: "#6b6b68",
          };

          return (
            <Link
              key={template.slug}
              href={`/notebook?template=${template.slug}`}
              className="template-card"
            >
              <div className="template-meta">
                <span className="template-category">{template.meta.category}</span>
                <span
                  className="template-difficulty"
                  style={{ background: difficulty.bg, color: difficulty.text }}
                >
                  {template.meta.difficulty}
                </span>
              </div>
              <h4 className="template-title">{template.meta.title}</h4>
              <p className="template-desc">{template.meta.description}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
