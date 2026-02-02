/**
 * TypeScript declarations and types for the MathNotebook component.
 *
 * This file defines the data model for managing notebook lines,
 * which can be either math (MathLive) or text (plain input).
 */

import type { MathfieldElement } from "mathlive";

/** Line mode - math (MathLive), text (plain input), header (title), or image (base64) */
export type LineMode = "math" | "text" | "header" | "image";

/**
 * Represents a single line in the math notebook.
 * Each line can be math (MathLive), text (plain input), header (title), or image (base64).
 */
export interface MathLine {
  /** Unique identifier for stable React keys */
  id: string;
  /** Content of the line (LaTeX for math, plain text for text/header, base64 for image) */
  content: string;
  /** Mode of the line - determines how it's rendered */
  mode: LineMode;
  /** Whether this line is problem context (true) or user reasoning (false) */
  isProblem: boolean;
}

/**
 * LLM feedback response structure.
 */
export interface LLMFeedback {
  /** "ok" if all steps valid, "issue" if a problem was found */
  status: "ok" | "issue";
  /** 1-indexed position of the problematic user step (only if status === "issue") */
  stepIndex?: number;
  /** LaTeX formatted feedback message */
  latex?: string;
}

/**
 * Hint response structure from the hint API.
 */
export interface HintResponse {
  /** LaTeX formatted hint */
  hint: string;
}

/**
 * Common props for line components.
 */
export interface LineProps {
  /** The line data */
  line: MathLine;
  /** Index of this line in the notebook */
  index: number;
  /** Whether this line should auto-focus on mount */
  autoFocus?: boolean;
  /** Position to place cursor when focusing ("start" or "end") */
  focusPosition?: "start" | "end";
  /** Callback when the line's content changes */
  onChange: (index: number, content: string) => void;
  /** Callback when the line's mode changes */
  onModeChange: (index: number, mode: LineMode) => void;
  /** Callback when Enter is pressed (create new line) */
  onEnterPress: (index: number) => void;
  /** Callback when navigation moves out of this field */
  onNavigate: (index: number, direction: "up" | "down" | "prev-end" | "next-start") => void;
  /** Callback when multi-line content is pasted */
  onMultiLinePaste: (index: number, lines: string[]) => void;
  /** Callback when backspace is pressed on empty line */
  onDeleteLine: (index: number) => void;
  /** Callback to toggle isProblem status */
  onToggleProblem: (index: number) => void;
  /** Callback to check reasoning up to this line */
  onCheckReasoning: (index: number) => void;
  /** Whether this line is currently being checked */
  isChecking?: boolean;
  /** Feedback for this line, if any */
  feedback?: LLMFeedback | null;
  /** Callback to dismiss feedback */
  onDismissFeedback?: (lineId: string) => void;
  /** Callback to get a hint for this line */
  onGetHint: (index: number) => void;
  /** Whether this line is currently loading a hint */
  isLoadingHint?: boolean;
  /** Hint for this line, if any */
  hint?: string | null;
  /** Callback to dismiss hint */
  onDismissHint?: (lineId: string) => void;
}

export type { MathfieldElement };

/**
 * Canvas overlay types for drawing/marking functionality.
 */

/** A single point in a drawing stroke */
export interface StrokePoint {
  x: number;
  y: number;
}

/** A complete drawing stroke */
export interface DrawingStroke {
  id: string;
  color: string;
  width: number;
  points: StrokePoint[];
}

/** Canvas overlay data */
export interface CanvasData {
  strokes: DrawingStroke[];
}

/** Drawing tool types */
export type DrawingTool = "pen" | "eraser";
