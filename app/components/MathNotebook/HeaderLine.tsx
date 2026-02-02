"use client";

/**
 * HeaderLine Component
 *
 * A centered, bold header/title line for the notebook.
 * - Enter: create new notebook line
 * - Tab: switch to math mode
 * - Click marker: cycle to image mode
 */

import { useEffect, useRef } from "react";
import type { LineProps } from "./types";

export default function HeaderLine({
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
}: LineProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle auto-focus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      if (focusPosition === "end") {
        inputRef.current.selectionStart = inputRef.current.value.length;
        inputRef.current.selectionEnd = inputRef.current.value.length;
      } else {
        inputRef.current.selectionStart = 0;
        inputRef.current.selectionEnd = 0;
      }
    }
  }, [autoFocus, focusPosition]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = inputRef.current;
    if (!input) return;

    // Enter - create new notebook line
    if (e.key === "Enter") {
      e.preventDefault();
      onEnterPress(index);
      return;
    }

    // Backspace on empty - delete line
    if (e.key === "Backspace" && input.value === "") {
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

    // Arrow up - navigate to previous line
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onNavigate(index, "up");
      return;
    }

    // Arrow down - navigate to next line
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onNavigate(index, "down");
      return;
    }

    // Arrow left at start - go to previous line
    if (e.key === "ArrowLeft" && input.selectionStart === 0) {
      e.preventDefault();
      onNavigate(index, "prev-end");
      return;
    }

    // Arrow right at end - go to next line
    if (e.key === "ArrowRight" && input.selectionStart === input.value.length) {
      e.preventDefault();
      onNavigate(index, "next-start");
      return;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(index, e.target.value);
  };

  const handleMarkerClick = () => {
    // Cycle: header → image
    onModeChange(index, "image");
  };

  const handleProblemToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleProblem(index);
  };

  return (
    <div
      className={`math-line header-line ${line.isProblem ? "is-problem" : ""}`}
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
        className="mode-marker header-marker"
        onClick={handleMarkerClick}
        title="Click to switch mode"
      >
        H
      </span>
      <input
        ref={inputRef}
        type="text"
        value={line.content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="header-input"
      />
      <button
        className="delete-line-button"
        onClick={(e) => { e.stopPropagation(); onDeleteLine(index); }}
        title="Delete line"
      >
        ✕
      </button>
    </div>
  );
}
