"use client";

/**
 * MathNotebook Component
 *
 * A full-screen math notebook with seamless text and math editing.
 *
 * How it works:
 * - New lines start in "auto" mode
 * - Auto mode detects what you want:
 *   - Type a letter → switches to text mode
 *   - Type \ or digit → switches to math mode
 *   - Type $ → switches to math mode
 *   - Paste LaTeX → switches to math mode
 * - Press Tab to toggle between text and math mode
 * - Press Enter to create a new line
 * - Arrow keys navigate between lines
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { MathLine, LineMode } from "./types";
import MathLineComponent from "./MathLine";
import TextLine from "./TextLine";
import HeaderLine from "./HeaderLine";
import ImageLine from "./ImageLine";

// Import MathLive and configure fonts
import { MathfieldElement } from "mathlive";
MathfieldElement.fontsDirectory = "https://unpkg.com/mathlive/fonts/";

function generateId(): string {
  return crypto.randomUUID();
}

const STORAGE_KEY = "mathnotebook-autosave";

// Create initial lines with example content
function createInitialLines(): MathLine[] {
  return [
    {
      id: generateId(),
      content: "My Math Notes",
      mode: "header" as LineMode,
    },
    {
      id: generateId(),
      content: "Here is a note",
      mode: "text" as LineMode,
    },
    {
      id: generateId(),
      content: "\\begin{gather}x=5\\\\y=3\\\\x+y=8\\end{gather}",
      mode: "math" as LineMode,
    },
  ];
}

export default function MathNotebook() {
  // Start with initial lines, will load from localStorage if available
  const [lines, setLines] = useState<MathLine[]>(() => createInitialLines());
  const [isLoaded, setIsLoaded] = useState(false);

  const [focusState, setFocusState] = useState<{
    index: number;
    position: "start" | "end";
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
          setLines(data.lines);
        }
      } catch (e) {
        // Ignore invalid data
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever lines change (after initial load)
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines }));
    }
  }, [lines, isLoaded]);

  // Update line content
  const handleChange = useCallback((index: number, content: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], content };
      return next;
    });
  }, []);

  // Track if focus change is from mode switch (to skip scroll)
  const isModeChangeRef = useRef(false);
  const pendingFocusRef = useRef<{ index: number; position: "start" | "end" } | null>(null);

  const handleModeChange = useCallback((index: number, mode: LineMode) => {
    // Mark this as a mode change to skip scrolling
    isModeChangeRef.current = true;
    pendingFocusRef.current = { index, position: "end" };
    setLines((prev) => {
      const next = [...prev];
      let content = next[index].content;

      // When switching to text mode, strip gather environment
      if (mode === "text" && content.includes("\\begin{gather}")) {
        content = content
          .replace(/\\begin\{gather\}/g, "")
          .replace(/\\end\{gather\}/g, "")
          .replace(/\\\\/g, "\n")
          .trim();
      }

      next[index] = { ...next[index], content, mode };
      return next;
    });
  }, []);

  // Handle pending focus after mode change
  useEffect(() => {
    if (pendingFocusRef.current) {
      const { index, position } = pendingFocusRef.current;
      pendingFocusRef.current = null;
      setFocusState({ index, position });
    }
  }, [lines]);

  // Create a new line below current (Shift+Enter)
  const handleEnterPress = useCallback((index: number) => {
    const currentMode = lines[index]?.mode || "math";
    // Header and image lines should create text lines
    const newMode = (currentMode === "header" || currentMode === "image") ? "text" : currentMode;
    const newLine = {
      id: generateId(),
      content: "",
      mode: newMode,
    };
    setLines((prev) => [
      ...prev.slice(0, index + 1),
      newLine,
      ...prev.slice(index + 1),
    ]);
    setFocusState({ index: index + 1, position: "start" });
  }, [lines]);

  // Navigate between lines
  const handleNavigate = useCallback(
    (index: number, direction: "up" | "down" | "prev-end" | "next-start") => {
      switch (direction) {
        case "up":
          if (index > 0) setFocusState({ index: index - 1, position: "end" });
          break;
        case "down":
          if (index < lines.length - 1) {
            setFocusState({ index: index + 1, position: "start" });
          }
          break;
        case "prev-end":
          if (index > 0) setFocusState({ index: index - 1, position: "end" });
          break;
        case "next-start":
          if (index < lines.length - 1) {
            setFocusState({ index: index + 1, position: "start" });
          }
          break;
      }
    },
    [lines.length]
  );

  // Handle multi-line paste
  const handleMultiLinePaste = useCallback((index: number, pastedLines: string[]) => {
    if (pastedLines.length === 0) return;

    // Inherit mode from the line being pasted into
    const currentMode = lines[index]?.mode || "math";

    const newLines = pastedLines.map((content) => ({
      id: generateId(),
      content,
      mode: currentMode,
    }));

    setLines((prev) => [
      ...prev.slice(0, index),
      ...newLines,
      ...prev.slice(index + 1),
    ]);

    setFocusState({
      index: index + newLines.length - 1,
      position: "end",
    });
  }, [lines]);

  // Delete line
  const handleDeleteLine = useCallback((index: number) => {
    if (lines.length === 1) {
      // Replace the only line with an empty text line
      setLines([{ id: generateId(), content: "", mode: "text" as LineMode }]);
      setFocusState({ index: 0, position: "start" });
      return;
    }

    setLines((prev) => [...prev.slice(0, index), ...prev.slice(index + 1)]);
    setFocusState({ index: Math.max(0, index - 1), position: "end" });
  }, [lines.length]);


  // Export as LaTeX
  const exportLatex = useCallback((): string => {
    return lines
      .map((line) => {
        if (line.mode === "text") {
          return line.content ? `\\text{${line.content}}` : "";
        }
        return line.content;
      })
      .filter((content) => content.trim() !== "")
      .join("\n\n");
  }, [lines]);

  // Expose exportLatex to window
  useEffect(() => {
    (window as unknown as { exportLatex: () => string }).exportLatex = exportLatex;
    return () => {
      delete (window as unknown as { exportLatex?: () => string }).exportLatex;
    };
  }, [exportLatex]);

  // Export notebook as JSON
  const exportJSON = useCallback((): string => {
    return JSON.stringify({ lines }, null, 2);
  }, [lines]);

  // Import notebook from JSON
  const importJSON = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
        setLines(data.lines);
      }
    } catch (e) {
      console.error("Invalid JSON");
    }
  }, []);

  // Export button handler - downloads JSON file
  const handleExport = useCallback(() => {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notebook.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [exportJSON]);

  // Import button handler - opens file picker
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => importJSON(reader.result as string);
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importJSON]);

  // New button handler - starts fresh with header
  const handleNew = useCallback(() => {
    if (confirm("Clear notebook and start fresh?")) {
      setLines(createInitialLines());
    }
  }, []);

  // Clear button handler - removes everything
  const handleClear = useCallback(() => {
    if (confirm("Clear all content?")) {
      setLines([{ id: generateId(), content: "", mode: "text" as LineMode }]);
    }
  }, []);

  // Clear focus state after applied
  useEffect(() => {
    if (focusState !== null) {
      const timer = setTimeout(() => setFocusState(null), 50);
      return () => clearTimeout(timer);
    }
  }, [focusState]);

  // Auto-scroll to focused line (skip for mode changes to prevent jarring scroll)
  useEffect(() => {
    if (focusState !== null && containerRef.current && !isModeChangeRef.current) {
      const lineElements = containerRef.current.querySelectorAll(".math-line");
      const targetLine = lineElements[focusState.index];
      if (targetLine) {
        targetLine.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    // Reset the mode change flag after handling
    isModeChangeRef.current = false;
  }, [focusState]);

  // Click anywhere to type on that line
  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only handle clicks on the container background, not on existing line content
      const target = e.target as HTMLElement;
      if (target !== containerRef.current && !target.classList.contains("ruled-paper") && !target.classList.contains("notebook-hint")) {
        return;
      }

      const container = containerRef.current;
      if (!container) return;

      const clickY = e.clientY;

      // Find which line was clicked by checking actual element bounds
      const lineElements = container.querySelectorAll(".math-line");
      let targetIndex = lines.length - 1;

      for (let i = 0; i < lineElements.length; i++) {
        const rect = lineElements[i].getBoundingClientRect();
        if (clickY >= rect.top && clickY <= rect.bottom) {
          targetIndex = i;
          break;
        }
        // If click is above this line, target the previous line
        if (clickY < rect.top) {
          targetIndex = Math.max(0, i - 1);
          break;
        }
      }

      // Focus the line (at end if has content, start if empty)
      const hasContent = lines[targetIndex]?.content !== "";
      setFocusState({ index: targetIndex, position: hasContent ? "end" : "start" });
    },
    [lines.length]
  );

  // Render appropriate line component based on mode
  const renderLine = (line: MathLine, index: number) => {
    const commonProps = {
      line,
      index,
      autoFocus: focusState?.index === index,
      focusPosition: focusState?.position,
      onChange: handleChange,
      onModeChange: handleModeChange,
      onEnterPress: handleEnterPress,
      onNavigate: handleNavigate,
      onMultiLinePaste: handleMultiLinePaste,
      onDeleteLine: handleDeleteLine,
    };

    if (line.mode === "text") {
      return <TextLine key={line.id} {...commonProps} />;
    }
    if (line.mode === "header") {
      return <HeaderLine key={line.id} {...commonProps} />;
    }
    if (line.mode === "image") {
      return <ImageLine key={line.id} {...commonProps} />;
    }
    return <MathLineComponent key={line.id} {...commonProps} />;
  };

  return (
    <div className="notebook-container">
      <div className="notebook-toolbar">
        <button
          onClick={handleNew}
          style={{ padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#999" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#666"; e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; e.currentTarget.style.textDecoration = "none"; }}
        >New</button>
        <button
          onClick={handleClear}
          style={{ padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#999" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#666"; e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; e.currentTarget.style.textDecoration = "none"; }}
        >Clear</button>
        <button
          onClick={handleImport}
          style={{ padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#999" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#666"; e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; e.currentTarget.style.textDecoration = "none"; }}
        >Import</button>
        <button
          onClick={handleExport}
          style={{ padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#999" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#666"; e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; e.currentTarget.style.textDecoration = "none"; }}
        >Export</button>
      </div>
      <div
        ref={containerRef}
        className="ruled-paper"
        onClick={handleContainerClick}
      >
        <div className="notebook-hint">Click marker to cycle modes · Tab to toggle between text and math modes</div>
        {lines.map((line, index) => renderLine(line, index))}
      </div>
    </div>
  );
}
