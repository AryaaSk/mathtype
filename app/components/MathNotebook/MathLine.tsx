"use client";

/**
 * MathLine Component
 *
 * A wrapper around MathLive's <math-field> web component that handles:
 * - LaTeX input with visual rendering
 * - Enter key: Creates new line below
 * - Arrow navigation: Move between lines
 * - Tab: Switch to text mode
 */

import { useEffect, useRef, useCallback } from "react";
import type { LineProps, MathfieldElement } from "./types";

export default function MathLine({
  line,
  index,
  autoFocus = false,
  focusPosition = "start",
  onChange,
  onModeChange,
  onEnterPress,
  onNavigate,
  onMultiLinePaste,
  onDeleteLine,
  onToggleProblem,
  onCheckReasoning,
  isChecking = false,
  feedback = null,
  onDismissFeedback,
  onGetHint,
  isLoadingHint = false,
}: LineProps) {
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  // Store initial content - don't update math-field children after mount
  const initialContent = useRef(line.content);
  // Track if component is mounted to avoid operations on unmounted component
  const isMountedRef = useRef(true);

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Configure the MathLive field after it mounts.
   */
  useEffect(() => {
    const mf = mathFieldRef.current;
    if (!mf) return;

    // Check if field is effectively empty (including empty gather/align environments)
    const isEffectivelyEmpty = (val: string) => {
      const trimmed = val.trim();
      if (trimmed === "") return true;
      // Empty environment like \begin{gather}\end{gather} or \begin{gather}\\\end{gather}
      const emptyEnv = trimmed.match(/^\\begin\{(gather|align)\}(\\\\)*\\end\{\1\}$/);
      return !!emptyEnv;
    };

    // Configure MathLive options
    // "auto" shows virtual keyboard on touch devices
    mf.mathVirtualKeyboardPolicy = "auto";
    mf.smartFence = true;
    mf.smartSuperscript = true;
    mf.smartMode = false;
    // Allow spaces in math mode (inserts \, thin space)
    mf.mathModeSpace = "\\,";

    // Style selection and text in shadow DOM
    if (mf.shadowRoot) {
      const style = document.createElement("style");
      style.textContent = `
        /* Selection styling */
        .ML__selection {
          background: rgba(59, 130, 246, 0.2) !important;
        }
        .ML__contains-highlight, .ML__highlight {
          background: transparent !important;
        }
        /* Remove blue highlight on text in math mode */
        .ML__text {
          background: transparent !important;
          color: inherit !important;
        }
      `;
      mf.shadowRoot.appendChild(style);
    }

    const handleBeforeInput = (ev: InputEvent) => {
      // Enter key - create new notebook line
      if (ev.inputType === "insertLineBreak") {
        ev.preventDefault();
        onEnterPress(index);
        return;
      }

      // Multi-line paste
      if (ev.inputType === "insertFromPaste") {
        const clipboardData = (ev as InputEvent & { clipboardData?: DataTransfer }).clipboardData;
        const text = clipboardData?.getData("text/plain") || "";

        // Split by newlines OR by \\ (LaTeX line breaks)
        let lines: string[];
        if (text.includes("\\\\")) {
          // LaTeX line breaks - split by \\
          lines = text.split("\\\\").map(l => l.trim()).filter(l => l !== "");
        } else {
          // Regular newlines
          lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
        }

        if (lines.length > 1) {
          ev.preventDefault();
          onMultiLinePaste(index, lines);
          return;
        }
      }

      // Backspace on empty - delete line (beforeinput fires BEFORE content changes)
      if (ev.inputType === "deleteContentBackward" && isEffectivelyEmpty(mf.value)) {
        ev.preventDefault();
        onDeleteLine(index);
        return;
      }
    };

    const handleMoveOut = (ev: CustomEvent<{ direction: string }>) => {
      ev.preventDefault();
      const direction = ev.detail.direction;
      switch (direction) {
        case "upward":
          onNavigate(index, "up");
          break;
        case "downward":
          onNavigate(index, "down");
          break;
        case "backward":
          onNavigate(index, "prev-end");
          break;
        case "forward":
          onNavigate(index, "next-start");
          break;
      }
    };

    const handleInput = () => {
      onChange(index, mf.value);
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (ev: KeyboardEvent) => {
      // Tab - switch to text mode
      if (ev.key === "Tab") {
        ev.preventDefault();
        onModeChange(index, "text");
        return;
      }

      // Escape - exit any nested mode (like \text{}) back to math
      if (ev.key === "Escape") {
        ev.preventDefault();
        try {
          mf.executeCommand("moveToMathfieldEnd");
        } catch {
          // Ignore - MathLive may be in an inconsistent state
        }
        return;
      }

      // Shift+Enter - add line break within math field (multi-line)
      if (ev.key === "Enter" && ev.shiftKey) {
        ev.preventDefault();
        try {
          const value = mf.value;

          // If already in a multi-line environment, insert \\ at cursor position
          const envMatch = value.match(/\\begin\{(gather|align)\}([\s\S]*?)\\end\{\1\}/);
          if (envMatch) {
            // Insert \\ at the current cursor position
            mf.insert("\\\\");
            onChange(index, mf.value);
            return;
          }

          // Not in environment yet - split at cursor and wrap in gather
          const cursorPos = mf.selection?.ranges?.[0]?.[0] ?? 0;
          const lastOffset = mf.lastOffset;

          // Get content before and after cursor
          mf.selection = { ranges: [[cursorPos, lastOffset]] };
          const afterCursor = mf.getValue(mf.selection, "latex").replace(/\\,/g, "");

          mf.selection = { ranges: [[0, cursorPos]] };
          const beforeCursor = mf.getValue(mf.selection, "latex").replace(/\\,/g, "");

          // Wrap in gather environment with line break at cursor position
          const newValue = `\\begin{gather}${beforeCursor}\\\\${afterCursor}\\end{gather}`;
          mf.value = newValue;
          onChange(index, mf.value);
        } catch {
          // Ignore - MathLive may be in an inconsistent state
        }
        return;
      }

      // Cmd/Ctrl+C - only copy if there's a selection
      if ((ev.metaKey || ev.ctrlKey) && ev.key === "c") {
        ev.preventDefault(); // Always prevent default MathLive copy behavior

        // Check if there's an actual selection
        const selection = mf.selection;
        if (!selection?.ranges?.length) return;

        const [start, end] = selection.ranges[0];
        if (start === end) return; // No actual selection

        const fullValue = mf.value;
        let selectedLatex = mf.getValue(selection, "latex");

        if (!selectedLatex || selectedLatex.trim() === "") return;

        // Strip thin space markers (\,) for cleaner output - do this first
        selectedLatex = selectedLatex.replace(/\\,/g, "");

        // Check if we're in a multi-line environment and restore \\ markers
        const envMatch = fullValue.match(/\\begin\{(gather|align)\}([\s\S]*?)\\end\{\1\}/);
        if (envMatch) {
          const envType = envMatch[1]; // "gather" or "align"
          const envContent = envMatch[2];
          // Keep all rows including empty ones for blank line preservation
          const rows = envContent.split("\\\\").map(r => r.trim().replace(/\\,/g, ""));
          const nonEmptyRows = rows.filter(r => r !== "");
          const selectedTrimmed = selectedLatex.trim();

          // Find which non-empty rows are included in the selection
          const includedIndices: number[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (row === "") continue; // Skip empty rows for matching
            if (selectedTrimmed.includes(row) || row.includes(selectedTrimmed)) {
              includedIndices.push(i);
            }
          }

          // If we have matches, include all rows between first and last match (preserving blank lines)
          if (includedIndices.length > 1) {
            const firstIdx = Math.min(...includedIndices);
            const lastIdx = Math.max(...includedIndices);
            const selectedRows = rows.slice(firstIdx, lastIdx + 1);
            selectedLatex = `\\begin{${envType}}\n${selectedRows.join("\\\\\n")}\\end{${envType}}`;
          } else if (includedIndices.length === 1 && nonEmptyRows.length > 1) {
            // Single row selected from multi-row content - still wrap it
            selectedLatex = `\\begin{${envType}}\n${rows[includedIndices[0]]}\\end{${envType}}`;
          }
        }

        navigator.clipboard.writeText(selectedLatex);
      }

      // Note: Backspace on empty is handled in beforeinput handler
    };

    // Handle paste with reliable clipboard access
    const handlePaste = (ev: ClipboardEvent) => {
      let text = ev.clipboardData?.getData("text/plain") || "";
      const currentValue = mf.value.trim();

      // If pasting content with environment wrapper into a field that already has one,
      // strip the wrapper from pasted content and merge
      const pastedEnvMatch = text.match(/\\begin\{(gather|align)\}([\s\S]*?)\\end\{\1\}/);
      const currentEnvMatch = currentValue.match(/\\begin\{(gather|align)\}([\s\S]*?)\\end\{\1\}/);

      if (pastedEnvMatch && currentEnvMatch) {
        ev.preventDefault();
        const envType = currentEnvMatch[1];
        const existingContent = currentEnvMatch[2]; // Keep original with all \\
        const pastedContent = pastedEnvMatch[2];

        // Simply append pasted content to existing, preserving all line breaks
        // Both contents already have their \\ structure intact
        const newContent = existingContent.trim()
          ? `${existingContent}\\\\${pastedContent}`
          : pastedContent;

        mf.value = `\\begin{${envType}}${newContent}\\end{${envType}}`;
        onChange(index, mf.value);
        return;
      }

      // If pasting a complete LaTeX environment into an empty field, let MathLive handle it
      if (pastedEnvMatch && (currentValue === "" || isEffectivelyEmpty(currentValue))) {
        return;
      }

      // If pasting environment into field with content but no environment,
      // wrap existing content and merge
      if (pastedEnvMatch && !currentEnvMatch && currentValue !== "") {
        ev.preventDefault();
        const envType = pastedEnvMatch[1];
        const pastedContent = pastedEnvMatch[2].trim();
        mf.value = `\\begin{${envType}}${currentValue}\\\\${pastedContent}\\end{${envType}}`;
        onChange(index, mf.value);
        return;
      }

      // Fallback: Check if pasting content with \\ but no environment (from external source)
      if (text.includes("\\\\") && !pastedEnvMatch) {
        ev.preventDefault();

        // If current line is empty/fresh, wrap pasted content in gather environment
        if (currentValue === "" || isEffectivelyEmpty(currentValue)) {
          mf.value = `\\begin{gather}${text}\\end{gather}`;
          onChange(index, mf.value);
          return;
        }

        // If current line already has an environment, insert rows into it
        if (currentEnvMatch) {
          const envType = currentEnvMatch[1];
          const existingContent = currentEnvMatch[2].trim();
          const newContent = existingContent ? `${existingContent}\\\\${text}` : text;
          mf.value = `\\begin{${envType}}${newContent}\\end{${envType}}`;
          onChange(index, mf.value);
          return;
        }

        // Current line has content but no environment - wrap everything in gather
        mf.value = `\\begin{gather}${currentValue}\\\\${text}\\end{gather}`;
        onChange(index, mf.value);
        return;
      }

      // For plain text with newlines, split into separate notebook lines
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");

      if (lines.length > 1) {
        ev.preventDefault();
        onMultiLinePaste(index, lines);
      }
      // Single line paste - let MathLive handle it
    };

    mf.addEventListener("beforeinput", handleBeforeInput as EventListener);
    mf.addEventListener("move-out", handleMoveOut as EventListener);
    mf.addEventListener("input", handleInput);
    mf.addEventListener("keydown", handleKeyDown);
    mf.addEventListener("paste", handlePaste as EventListener);

    return () => {
      mf.removeEventListener("beforeinput", handleBeforeInput as EventListener);
      mf.removeEventListener("move-out", handleMoveOut as EventListener);
      mf.removeEventListener("input", handleInput);
      mf.removeEventListener("keydown", handleKeyDown);
      mf.removeEventListener("paste", handlePaste as EventListener);
    };
  }, [index, onChange, onModeChange, onEnterPress, onNavigate, onMultiLinePaste, onDeleteLine]);

  // Handle auto-focus
  useEffect(() => {
    if (autoFocus && mathFieldRef.current) {
      const mf = mathFieldRef.current;

      const positionCursor = () => {
        if (!isMountedRef.current) return;
        try {
          if (focusPosition === "end") {
            mf.executeCommand("moveToMathfieldEnd");
          } else {
            mf.executeCommand("moveToMathfieldStart");
          }
        } catch {
          // Ignore - component may be unmounting
        }
      };

      // Focus and position cursor with small delay to ensure MathLive is ready
      const attemptFocus = () => {
        if (!isMountedRef.current) return;
        try {
          mf.focus();
          // Small delay before positioning to ensure field is ready
          requestAnimationFrame(() => {
            if (!isMountedRef.current) return;
            positionCursor();
          });
        } catch {
          // Retry after short delay
          setTimeout(() => {
            if (!isMountedRef.current) return;
            try {
              mf.focus();
              positionCursor();
            } catch {
              // Ignore
            }
          }, 20);
        }
      };

      attemptFocus();
    }
  }, [autoFocus, focusPosition]);

  const setRef = useCallback((el: MathfieldElement | null) => {
    mathFieldRef.current = el;
  }, []);

  const handleMarkerClick = () => {
    // Cycle: math → text
    onModeChange(index, "text");
  };

  const handleProblemToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleProblem(index);
  };

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckReasoning(index);
  };

  const handleHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGetHint(index);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismissFeedback?.(line.id);
  };

  return (
    <div
      className={`math-line ${line.isProblem ? "is-problem" : ""} ${isChecking ? "is-checking" : ""}`}
      style={{ marginLeft: 76 }}
    >
      <span
        className={`problem-toggle ${line.isProblem ? "is-problem" : "is-work"}`}
        onClick={handleProblemToggle}
        title={line.isProblem ? "Problem context (click to mark as work)" : "Click to mark as problem context"}
        style={{ left: -60 }}
      >
        {line.isProblem ? "P" : ""}
      </span>
      <span
        className="mode-marker math-marker"
        onClick={handleMarkerClick}
        title="Click to switch mode"
        style={{ cursor: "pointer" }}
      >∑</span>
      <math-field ref={setRef}>{initialContent.current}</math-field>
      <button
        className="delete-line-button"
        onClick={(e) => { e.stopPropagation(); onDeleteLine(index); }}
        title="Delete line"
      >
        ✕
      </button>
      {!line.isProblem && (
        <>
          <button
            className="hint-button"
            onClick={handleHint}
            disabled={isLoadingHint}
            title="Get a hint"
            style={{
              position: "absolute",
              right: 30,
              top: "50%",
              transform: "translateY(-50%)",
              width: 20,
              height: 20,
              padding: 0,
              border: "none",
              background: "transparent",
              cursor: isLoadingHint ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 600,
              color: "#ccc",
            }}
            onMouseEnter={(e) => { if (!isLoadingHint) e.currentTarget.style.color = "#f59e0b"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#ccc"; }}
          >
            {isLoadingHint ? "..." : "?"}
          </button>
          <button
            className="check-button"
            onClick={handleCheck}
            disabled={isChecking}
            title="Check reasoning up to here"
          />
        </>
      )}
      {feedback && (
        <div className={`feedback-display ${feedback.status === "ok" ? "feedback-ok" : "feedback-issue"}`}>
          <span className="feedback-icon">{feedback.status === "ok" ? "✓" : "✗"}</span>
          <div className="feedback-content">
            <math-field read-only>{feedback.latex || (feedback.status === "ok" ? "\\text{All steps valid.}" : "\\text{Error in reasoning.}")}</math-field>
          </div>
          <button className="feedback-dismiss" onClick={handleDismiss}>×</button>
        </div>
      )}
    </div>
  );
}
