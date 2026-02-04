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
  hints?: Record<string, string>;
}

const SYSTEM_PROMPT = `You are a careful mathematics tutor evaluating a student's reasoning.

IMPORTANT: Read ALL steps first to understand the full context before evaluating any individual step. Later steps may clarify, define, or justify earlier statements. An informal statement followed by a formal definition is valid.

CRITICAL RULES:
1. READ EVERYTHING FIRST - understand the student's full argument before judging
2. Be EXTREMELY conservative - only flag errors you are 100% certain about
3. If a statement is clarified or justified by a later step, it is NOT an error
4. If a statement is arguably correct under some interpretation, mark it as OK
5. NEVER contradict yourself in feedback
6. The student may be using different but equivalent definitions
7. When in doubt, assume the student is correct

You will receive:
- **PROBLEM CONTEXT** - Given information (treat as correct)
- **USER STEPS** - Student's work to evaluate AS A WHOLE

Evaluation process:
1. Read all steps to understand the complete argument
2. For each step, ask: "Given everything else the student wrote, is this wrong?"
3. Only flag a step if it's mathematically incorrect even considering the full context

Response format (JSON only):
- If all steps are correct OR you have ANY doubt: {"status": "ok"}
- If there are DEFINITE errors: {"status": "issue", "issues": [{"stepIndex": N, "latex": "feedback"}, ...]}

N is the 1-indexed step number.

The "latex" field must be valid LaTeX using \\text{} for prose. Keep feedback to ONE clear sentence.

Do NOT explain the correct answer - just identify the error briefly.`;

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
  userLines: UserLine[],
  hints?: Record<string, string>
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

  // User steps section - with hints inline after each step
  let userText = "## USER STEPS (To Evaluate)\n\n";
  for (let i = 0; i < userLines.length; i++) {
    const line = userLines[i];
    const hint = hints?.[line.lineId];

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
      // Add hint after image if present
      if (hint) {
        parts.push({ type: "text", text: `\n  [Hint given: $${hint}$]\n` });
      } else {
        parts.push({ type: "text", text: "\n" });
      }
    } else {
      userText += `Step ${i + 1}: ${formatLineContent(line)}\n`;
      if (hint) {
        userText += `  [Hint given: $${hint}$]\n`;
      }
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
    const userMessages = buildUserMessage(body.problemLines, body.userLines, body.hints);

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

    // Normalize response - ensure issues array exists for "issue" status
    if (parsed.status === "issue") {
      // Handle old format (single stepIndex/latex) or new format (issues array)
      if (!parsed.issues && parsed.stepIndex) {
        parsed.issues = [{ stepIndex: parsed.stepIndex, latex: parsed.latex }];
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("OpenAI API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
