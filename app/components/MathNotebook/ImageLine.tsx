"use client";

/**
 * ImageLine Component
 *
 * Displays an image stored as base64 in the notebook.
 * - Click "Add Image" to pick a file
 * - Drag and drop an image onto the placeholder
 * - Image is stored as base64 data URL in content
 * - Click marker to cycle modes
 */

import { useRef, useState } from "react";
import type { LineProps } from "./types";

export default function ImageLine({
  line,
  index,
  onChange,
  onModeChange,
  onEnterPress,
  onDeleteLine,
  onToggleProblem,
  onCheckReasoning,
  isChecking = false,
  feedback = null,
  onDismissFeedback,
}: LineProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const loadImageFile = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onChange(index, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tab - switch to math mode (only if no image loaded)
    if (e.key === "Tab" && !line.content) {
      e.preventDefault();
      onModeChange(index, "math");
      return;
    }

    // Backspace on empty - delete line
    if (e.key === "Backspace" && !line.content) {
      e.preventDefault();
      onDeleteLine(index);
      return;
    }

    // Enter - create new line
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnterPress(index);
      return;
    }
  };

  const handleMarkerClick = () => {
    // Only allow mode switch if no image loaded
    if (!line.content) {
      onModeChange(index, "math");
    }
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
      className={`math-line image-line ${line.isProblem ? "is-problem" : ""} ${isChecking ? "is-checking" : ""}`}
      style={{ marginLeft: 76 }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
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
        className="mode-marker image-marker"
        onClick={handleMarkerClick}
        title="Click to switch mode"
      >
        IMG
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
        {line.content ? (
          <img
            src={line.content}
            alt="Notebook image"
            style={{ maxWidth: "calc(100% - 40px)", maxHeight: "400px", objectFit: "contain" }}
          />
        ) : (
          <div
            onClick={handleFileSelect}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              padding: "16px 32px",
              border: isDragging ? "2px dashed #3b82f6" : "1px dashed #ccc",
              borderRadius: "4px",
              background: isDragging ? "rgba(59, 130, 246, 0.05)" : "none",
              cursor: "pointer",
              color: isDragging ? "#3b82f6" : "#999",
              fontSize: "14px",
              transition: "all 0.15s ease",
            }}
          >
            {isDragging ? "Drop image here" : "Click or drop image"}
          </div>
        )}
      </div>
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
