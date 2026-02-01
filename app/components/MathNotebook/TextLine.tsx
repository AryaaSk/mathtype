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

  return (
    <div className="math-line text-line">
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
    </div>
  );
}
