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

const SYSTEM_PROMPT = `You are a mathematics tutor evaluating a student's reasoning. You will receive:

1. **PROBLEM CONTEXT** - Given information that should be treated as correct (axioms, problem statements, given equations)
2. **USER STEPS** - The student's work to evaluate, numbered starting from 1

Your task:
- Verify each user step logically follows from the problem context AND all previous user steps
- Identify the FIRST step that contains a CLEAR mathematical error
- Only flag errors you are CERTAIN about - algebraic mistakes, sign errors, wrong formulas, invalid operations
- Do NOT flag numerical approximations or rounding as errors unless clearly wrong by orders of magnitude
- When in doubt, assume the student is correct

Response format (JSON only):
- If all steps are correct OR you are unsure: {"status": "ok", "latex": "\\\\text{All steps are valid.}"}
- If there's a DEFINITE error: {"status": "issue", "stepIndex": N, "latex": "LaTeX feedback"}

Where N is the 1-indexed position in the USER STEPS (not counting problem lines).

IMPORTANT: The "latex" field must contain valid LaTeX that will be rendered in a math display. Use \\text{} for prose and inline math symbols. Keep it concise (1-2 sentences). Examples:
- "\\\\text{The derivative of } \\\\sin(x) \\\\text{ is } \\\\cos(x)\\\\text{, not } -\\\\cos(x)\\\\text{.}"
- "\\\\text{Sign error: } \\\\arctan(-x) = -\\\\arctan(x)\\\\text{.}"

Focus on what went wrong. Do not provide the full solution. Be conservative - only report clear errors.`;

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
    let problemText = "## PROBLEM CONTEXT (Given Information)\n\n";
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
  let userText = "## USER STEPS (To Evaluate)\n\n";
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
  if (body.userLines.length === 0) {
    return NextResponse.json(
      { error: "No user lines to evaluate" },
      { status: 400 }
    );
  }

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
      max_completion_tokens: 500,
      temperature: 0.1,
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
    if (parsed.status !== "ok" && parsed.status !== "issue") {
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
