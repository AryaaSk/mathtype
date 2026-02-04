"use client";

/**
 * BreakLine Component
 *
 * A visual divider that separates different problems/questions in a notebook.
 * When AI marking is run, it only considers content after the most recent break.
 */

import type { LineProps } from "./types";

export default function BreakLine({
  line,
  index,
  onModeChange,
  onDeleteLine,
  onEnterPress,
  onNavigate,
  autoFocus = false,
}: LineProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      onModeChange(index, "math");
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnterPress(index);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      onDeleteLine(index);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      onNavigate(index, "up");
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      onNavigate(index, "down");
    }
  };

  const handleMarkerClick = () => {
    onModeChange(index, "math");
  };

  return (
    <div
      className="math-line break-line"
      style={{ marginLeft: 76 }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={(el) => {
        if (autoFocus && el) {
          el.focus();
        }
      }}
    >
      <span
        className="mode-marker break-marker"
        onClick={handleMarkerClick}
        title="Section break - Click to switch mode"
        style={{ cursor: "pointer", color: "#999", fontSize: "12px" }}
      >
        ―
      </span>
      <div style={{ flex: 1 }} />
      <button
        className="delete-line-button"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteLine(index);
        }}
        title="Delete break"
      >
        ✕
      </button>
    </div>
  );
}
