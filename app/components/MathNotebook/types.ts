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
}

export type { MathfieldElement };
