"use client";

/**
 * TextLine Component
 *
 * A multi-line text area for prose/annotations in the notebook.
 * - Enter: new line within the text field
 * - Shift+Enter: create new notebook line
 * - Tab: switch to math mode
 */

import { useEffect, useRef } from "react";
import type { LineProps } from "./types";

export default function TextLine({
  line,
  index,
  autoFocus = false,
  focusPosition = "start",
  onChange,
  onModeChange,
  onEnterPress,
  onNavigate,
  onDeleteLine,
  onToggleProblem,
  onCheckReasoning,
  isChecking = false,
  feedback = null,
  onDismissFeedback,
}: LineProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  const autoResize = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  // Handle auto-focus
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
      // Position cursor
      if (focusPosition === "end") {
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
      } else {
        textareaRef.current.selectionStart = 0;
        textareaRef.current.selectionEnd = 0;
      }
    }
  }, [autoFocus, focusPosition]);

  // Auto-resize on content change
  useEffect(() => {
    autoResize();
  }, [line.content]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Enter - create new notebook line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnterPress(index);
      return;
    }

    // Shift+Enter - let it create new line in textarea (default behavior)

    // Backspace on empty - delete line
    if (e.key === "Backspace" && textarea.value === "") {
      e.preventDefault();
      onDeleteLine(index);
      return;
    }

    // Tab - switch to math mode
    if (e.key === "Tab") {
      e.preventDefault();
      onModeChange(index, "math");
      return;
    }

    // $ at start of empty field - switch to math mode
    if (e.key === "$" && textarea.value === "") {
      e.preventDefault();
      onModeChange(index, "math");
      return;
    }

    // Arrow up - navigate to previous line if at start
    if (e.key === "ArrowUp") {
      const isAtStart = textarea.selectionStart === 0;
      const isOnFirstLine = !textarea.value.substring(0, textarea.selectionStart).includes("\n");
      if (isAtStart || isOnFirstLine) {
        e.preventDefault();
        onNavigate(index, "up");
        return;
      }
    }

    // Arrow down - navigate to next line if at end
    if (e.key === "ArrowDown") {
      const isAtEnd = textarea.selectionStart === textarea.value.length;
      const isOnLastLine = !textarea.value.substring(textarea.selectionStart).includes("\n");
      if (isAtEnd || isOnLastLine) {
        e.preventDefault();
        onNavigate(index, "down");
        return;
      }
    }

    // Arrow left at start - go to previous line (only if no selection)
    if (e.key === "ArrowLeft" && textarea.selectionStart === 0 && textarea.selectionStart === textarea.selectionEnd) {
      e.preventDefault();
      onNavigate(index, "prev-end");
      return;
    }

    // Arrow right at end - go to next line (only if no selection)
    if (e.key === "ArrowRight" && textarea.selectionStart === textarea.value.length && textarea.selectionStart === textarea.selectionEnd) {
      e.preventDefault();
      onNavigate(index, "next-start");
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(index, e.target.value);
    autoResize();
  };

  const handleMarkerClick = () => {
    // Cycle: text → header
    onModeChange(index, "header");
  };

  const handleProblemToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleProblem(index);
  };

  const handleCheck = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCheckReasoning(index);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismissFeedback?.(line.id);
  };

  return (
    <div
      className={`math-line text-line ${line.isProblem ? "is-problem" : ""} ${isChecking ? "is-checking" : ""}`}
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
        className="mode-marker text-marker"
        onClick={handleMarkerClick}
        title="Click to switch mode"
      >
        T
      </span>
      <textarea
        ref={textareaRef}
        value={line.content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="text-input"
        rows={1}
      />
      <button
        className="delete-line-button"
        onClick={(e) => { e.stopPropagation(); onDeleteLine(index); }}
        title="Delete line"
      >
        ✕
      </button>
      {!line.isProblem && (
        <button
          className="check-button"
          onClick={handleCheck}
          disabled={isChecking}
          title="Check reasoning up to here"
        />
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
