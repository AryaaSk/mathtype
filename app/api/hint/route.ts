import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { LineMode } from "@/app/components/MathNotebook/types";

interface ProblemLine {
  mode: LineMode;
  content: string;
}

interface UserLine {
  mode: LineMode;
  content: string;
  lineId: string;
}

interface RequestBody {
  problemLines: ProblemLine[];
  userLines: UserLine[];
}

const SYSTEM_PROMPT = `You are a supportive mathematics tutor providing gentle hints. You will receive:

1. **PROBLEM CONTEXT** - The problem statement and given information
2. **USER STEPS** - The student's work so far

Your task:
- Understand what problem the student is trying to solve
- Review their work so far (if any)
- Provide a SMALL, HELPFUL HINT to guide them to the next step
- DO NOT give the solution or do the work for them
- DO NOT point out errors unless they're asking a completely wrong approach

Guidelines for hints:
- If they haven't started: Suggest what to identify or what formula/method might apply
- If they're stuck mid-problem: Hint at the next logical step without doing it
- If they're on the right track: Encourage and nudge toward what comes next
- If they seem lost: Suggest reviewing a concept or formula that would help
- Keep hints brief (1-2 sentences max)

Response format (JSON only):
{"hint": "LaTeX formatted hint"}

The "hint" field must contain valid LaTeX that will be rendered in a math display. Use \\text{} for prose and inline math symbols. Examples:
- "\\text{Try using the quadratic formula: } x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"
- "\\text{What happens if you substitute } y = 3 \\text{ into the first equation?}"
- "\\text{Consider: what's the derivative of } \\sin(x)\\text{?}"
- "\\text{You're on the right track! Now simplify the left side.}"

Be encouraging but concise. Guide, don't solve.`;

function formatLineContent(line: ProblemLine | UserLine): string {
  if (line.mode === "math") {
    return `$${line.content}$`;
  }
  if (line.mode === "image") {
    return "[Image attached]";
  }
  return line.content;
}

function buildUserMessage(
  problemLines: ProblemLine[],
  userLines: UserLine[]
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const parts: OpenAI.Chat.ChatCompletionContentPart[] = [];

  // Problem context section
  if (problemLines.length > 0) {
    let problemText = "## PROBLEM CONTEXT\n\n";
    for (const line of problemLines) {
      if (line.mode === "image" && line.content.startsWith("data:image")) {
        // Add text so far
        if (problemText.trim()) {
          parts.push({ type: "text", text: problemText });
          problemText = "";
        }
        // Add image
        parts.push({
          type: "image_url",
          image_url: { url: line.content, detail: "high" },
        });
        parts.push({ type: "text", text: "\n" });
      } else {
        problemText += `- ${formatLineContent(line)}\n`;
      }
    }
    if (problemText.trim()) {
      parts.push({ type: "text", text: problemText + "\n" });
    }
  }

  // User steps section
  if (userLines.length > 0) {
    let userText = "## STUDENT'S WORK SO FAR\n\n";
    for (let i = 0; i < userLines.length; i++) {
      const line = userLines[i];
      if (line.mode === "image" && line.content.startsWith("data:image")) {
        // Add text so far
        if (userText.trim()) {
          parts.push({ type: "text", text: userText });
          userText = "";
        }
        parts.push({ type: "text", text: `Step ${i + 1}: ` });
        // Add image
        parts.push({
          type: "image_url",
          image_url: { url: line.content, detail: "high" },
        });
        parts.push({ type: "text", text: "\n" });
      } else {
        userText += `Step ${i + 1}: ${formatLineContent(line)}\n`;
      }
    }
    if (userText.trim()) {
      parts.push({ type: "text", text: userText });
    }
  } else {
    parts.push({ type: "text", text: "\n## STUDENT'S WORK SO FAR\n\n(No work yet - student is just starting)\n" });
  }

  parts.push({ type: "text", text: "\nPlease provide a helpful hint for the next step." });

  return [{ role: "user", content: parts }];
}

export async function POST(request: NextRequest) {
  // Check for API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  // Parse request body
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  // Validate request
  if (!body.problemLines || !Array.isArray(body.problemLines)) {
    return NextResponse.json(
      { error: "Missing or invalid problemLines array" },
      { status: 400 }
    );
  }
  if (!body.userLines || !Array.isArray(body.userLines)) {
    return NextResponse.json(
      { error: "Missing or invalid userLines array" },
      { status: 400 }
    );
  }

  // Unlike check-reasoning, we allow empty userLines (student just starting)

  const openai = new OpenAI({ apiKey });

  try {
    const userMessages = buildUserMessage(body.problemLines, body.userLines);

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...userMessages,
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 300,
      temperature: 0.7, // Slightly higher for more varied hints
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "Empty response from OpenAI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse OpenAI response as JSON" },
        { status: 500 }
      );
    }

    // Validate response structure
    if (typeof parsed.hint !== "string") {
      return NextResponse.json(
        { error: "Invalid response structure from OpenAI" },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("OpenAI API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
