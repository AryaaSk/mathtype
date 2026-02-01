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

  return (
    <div className="math-line image-line" tabIndex={0} onKeyDown={handleKeyDown}>
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
        <button
          onClick={() => onDeleteLine(index)}
          style={{
            padding: "4px 8px",
            border: "none",
            background: "none",
            color: "#dc2626",
            cursor: "pointer",
            fontSize: "14px",
            marginLeft: "auto",
          }}
          title="Delete line"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
