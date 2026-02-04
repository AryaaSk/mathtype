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
import type { MathLine, LineMode, LLMFeedback, HintResponse } from "./types";
import MathLineComponent from "./MathLine";
import TextLine from "./TextLine";
import HeaderLine from "./HeaderLine";
import ImageLine from "./ImageLine";
import BreakLine from "./BreakLine";
// Canvas overlay hidden for now - can be re-enabled later
// import type { CanvasData, DrawingStroke, DrawingTool } from "./types";
// import CanvasOverlay from "./CanvasOverlay";

// MathLive fonts are configured on first render via useEffect below

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
      isProblem: false,
    },
    {
      id: generateId(),
      content: "Here is a note",
      mode: "text" as LineMode,
      isProblem: false,
    },
    {
      id: generateId(),
      content: "\\begin{gather}x=5\\\\y=3\\\\x+y=8\\end{gather}",
      mode: "math" as LineMode,
      isProblem: false,
    },
  ];
}

interface MathNotebookProps {
  templateSlug?: string | null;
  /** Initial lines to populate (skips localStorage) */
  initialLines?: MathLine[];
  /** Minimal mode - no toolbar, no localStorage, contained height */
  minimal?: boolean;
}

export default function MathNotebook({ templateSlug, initialLines, minimal = false }: MathNotebookProps = {}) {
  // Start with initial lines, will load from localStorage if available
  const [lines, setLines] = useState<MathLine[]>(() => initialLines || createInitialLines());
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(!!templateSlug);
  const [mathLiveReady, setMathLiveReady] = useState(false);


  const [focusState, setFocusState] = useState<{
    index: number;
    position: "start" | "end";
  } | null>(null);

  // Feedback state - maps lineId to feedback
  const [feedbackMap, setFeedbackMap] = useState<Map<string, LLMFeedback>>(
    new Map()
  );
  // Currently checking line ID
  const [checkingLineId, setCheckingLineId] = useState<string | null>(null);

  // Hint state - maps lineId to hint string
  const [hintMap, setHintMap] = useState<Map<string, string>>(new Map());
  // Currently loading hint line ID
  const [loadingHintLineId, setLoadingHintLineId] = useState<string | null>(null);

  // Drawing mode state - hidden for now, can be re-enabled later
  // const [isDrawMode, setIsDrawMode] = useState(false);
  // const [currentTool, setCurrentTool] = useState<DrawingTool>("pen");
  // const [currentColor, setCurrentColor] = useState("#ef4444");
  // const [strokeWidth] = useState(3);
  // const [canvasData, setCanvasData] = useState<CanvasData>({ strokes: [] });
  // const [contentHeight, setContentHeight] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadedFromTemplateRef = useRef(false);

  // Configure MathLive fonts on mount (client-side only)
  useEffect(() => {
    import("mathlive").then((module) => {
      module.MathfieldElement.fontsDirectory = "https://unpkg.com/mathlive/fonts/";
      // Small delay to ensure MathLive is fully initialized
      setTimeout(() => setMathLiveReady(true), 50);
    });
  }, []);

  // Load template if slug provided (runs before localStorage load)
  useEffect(() => {
    if (!templateSlug) {
      setLoadingTemplate(false);
      return;
    }

    setLoadingTemplate(true);
    fetch(`/api/templates/${templateSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Template not found");
        return res.json();
      })
      .then((data) => {
        if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
          // Mark that we loaded from template (prevents localStorage from overwriting)
          loadedFromTemplateRef.current = true;

          // Regenerate IDs to ensure uniqueness
          const newLines = data.lines.map((line: MathLine) => ({
            ...line,
            id: generateId(),
          }));
          setLines(newLines);
        }
      })
      .catch((err) => {
        console.error("Failed to load template:", err);
        // Will fall back to localStorage or initial
      })
      .finally(() => {
        setLoadingTemplate(false);
        setIsLoaded(true);
      });
  }, [templateSlug]);

  // Clear template from URL after it's been loaded (separate effect to avoid timing issues)
  useEffect(() => {
    if (isLoaded && loadedFromTemplateRef.current && templateSlug) {
      const url = new URL(window.location.href);
      url.searchParams.delete("template");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [isLoaded, templateSlug]);

  // Load from localStorage on mount (skip if template or initialLines is provided)
  useEffect(() => {
    if (templateSlug || initialLines || minimal || loadedFromTemplateRef.current) return; // Skip localStorage

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.lines && Array.isArray(data.lines) && data.lines.length > 0) {
          // Migrate legacy data: add isProblem if missing
          const migratedLines = data.lines.map((line: MathLine) => ({
            ...line,
            isProblem: typeof line.isProblem === "boolean" ? line.isProblem : false,
          }));
          setLines(migratedLines);

          // Restore hints if present
          if (data.hints && typeof data.hints === "object") {
            setHintMap(new Map(Object.entries(data.hints)));
          }

          // Restore feedback if present
          if (data.feedback && typeof data.feedback === "object") {
            setFeedbackMap(new Map(Object.entries(data.feedback)));
          }
        }
      } catch (e) {
        // Ignore invalid data
      }
    }
    setIsLoaded(true);
  }, [templateSlug, initialLines, minimal]);

  // Save to localStorage whenever lines, hints, or feedback change (after initial load, skip in minimal mode)
  useEffect(() => {
    if (isLoaded && !minimal) {
      const data = {
        lines,
        hints: Object.fromEntries(hintMap),
        feedback: Object.fromEntries(feedbackMap),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [lines, hintMap, feedbackMap, isLoaded, minimal]);

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

  // Create a new line below current (Enter)
  const handleEnterPress = useCallback((index: number) => {
    const currentMode = lines[index]?.mode || "math";
    // Header, image, and break lines should create text lines
    const newMode = (currentMode === "header" || currentMode === "image" || currentMode === "break") ? "text" : currentMode;
    const newLine: MathLine = {
      id: generateId(),
      content: "",
      mode: newMode,
      isProblem: false,
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

    const newLines: MathLine[] = pastedLines.map((content) => ({
      id: generateId(),
      content,
      mode: currentMode,
      isProblem: false,
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
      setLines([{ id: generateId(), content: "", mode: "text" as LineMode, isProblem: false }]);
      setFocusState({ index: 0, position: "start" });
      return;
    }

    setLines((prev) => [...prev.slice(0, index), ...prev.slice(index + 1)]);
    setFocusState({ index: Math.max(0, index - 1), position: "end" });
  }, [lines.length]);

  // Find section boundaries (between breaks) for a given line index
  const getSectionBounds = useCallback((lineIndex: number) => {
    let start = 0;
    let end = lines.length;

    // Find the most recent break before this line
    for (let i = lineIndex; i >= 0; i--) {
      if (lines[i].mode === "break") {
        start = i + 1;
        break;
      }
    }

    // Find the next break after this line
    for (let i = lineIndex + 1; i < lines.length; i++) {
      if (lines[i].mode === "break") {
        end = i;
        break;
      }
    }

    return { start, end };
  }, [lines]);

  // Get lines within a section, split into problem and user lines
  const getSectionLines = useCallback((upToIndex: number) => {
    const { start, end } = getSectionBounds(upToIndex);
    const relevantLines = lines.slice(start, upToIndex + 1);

    const problemLines = relevantLines
      .filter((l) => l.isProblem)
      .map((l) => ({ mode: l.mode, content: l.content }));

    const userLines = relevantLines
      .filter((l) => !l.isProblem && l.mode !== "header" && l.mode !== "break")
      .map((l) => ({ mode: l.mode, content: l.content, lineId: l.id }));

    // Collect hints for user lines in this section
    const hints: Record<string, string> = {};
    for (const line of relevantLines) {
      const hint = hintMap.get(line.id);
      if (hint) {
        hints[line.id] = hint;
      }
    }

    // Collect feedback for user lines in this section
    const feedback: Record<string, LLMFeedback> = {};
    for (const line of relevantLines) {
      const fb = feedbackMap.get(line.id);
      if (fb) {
        feedback[line.id] = fb;
      }
    }

    return { problemLines, userLines, sectionStart: start, sectionEnd: end, hints, feedback };
  }, [lines, getSectionBounds, hintMap, feedbackMap]);

  // Toggle isProblem status
  const handleToggleProblem = useCallback((index: number) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], isProblem: !next[index].isProblem };
      return next;
    });
    // Clear feedback for this line since its role changed
    const lineId = lines[index]?.id;
    if (lineId) {
      setFeedbackMap((prev) => {
        const next = new Map(prev);
        next.delete(lineId);
        return next;
      });
    }
  }, [lines]);

  // Check reasoning up to a line
  const handleCheckReasoning = useCallback(async (upToIndex: number) => {
    const targetLine = lines[upToIndex];
    if (!targetLine) return;

    setCheckingLineId(targetLine.id);

    const { problemLines, userLines, sectionStart, sectionEnd, hints } = getSectionLines(upToIndex);

    if (userLines.length === 0) {
      setCheckingLineId(null);
      return;
    }

    try {
      const response = await fetch("/api/check-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemLines, userLines, hints }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Check reasoning failed:", err.error);
        setCheckingLineId(null);
        return;
      }

      const data: LLMFeedback = await response.json();

      // Clear all feedback in this section, then add new feedback
      setFeedbackMap((prev) => {
        const next = new Map(prev);

        // Clear all feedback within this section
        for (let i = sectionStart; i < sectionEnd; i++) {
          next.delete(lines[i].id);
        }

        if (data.status === "ok") {
          // Show "all valid" on the clicked line
          next.set(targetLine.id, data);
        } else if (data.status === "issue" && data.issues && data.issues.length > 0) {
          // Set feedback on each problematic line
          for (const issue of data.issues) {
            const errorLineId = userLines[issue.stepIndex - 1]?.lineId;
            if (errorLineId) {
              next.set(errorLineId, {
                status: "issue",
                latex: issue.latex
              });
            }
          }
        }

        return next;
      });
    } catch (error) {
      console.error("Check reasoning error:", error);
    } finally {
      setCheckingLineId(null);
    }
  }, [lines, getSectionLines]);

  // Dismiss feedback for a line
  const handleDismissFeedback = useCallback((lineId: string) => {
    setFeedbackMap((prev) => {
      const next = new Map(prev);
      next.delete(lineId);
      return next;
    });
  }, []);

  // Get hint for a line
  const handleGetHint = useCallback(async (atIndex: number) => {
    const targetLine = lines[atIndex];
    if (!targetLine) return;

    setLoadingHintLineId(targetLine.id);

    const { problemLines, userLines, hints, feedback } = getSectionLines(atIndex);

    try {
      const response = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problemLines, userLines, hints, feedback }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Get hint failed:", err.error);
        setLoadingHintLineId(null);
        return;
      }

      const data: HintResponse = await response.json();

      // Store hint on the line
      setHintMap((prev) => {
        const next = new Map(prev);
        next.set(targetLine.id, data.hint);
        return next;
      });
    } catch (error) {
      console.error("Get hint error:", error);
    } finally {
      setLoadingHintLineId(null);
    }
  }, [lines, getSectionLines]);

  // Dismiss hint for a line
  const handleDismissHint = useCallback((lineId: string) => {
    setHintMap((prev) => {
      const next = new Map(prev);
      next.delete(lineId);
      return next;
    });
  }, []);

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
    const data = {
      lines,
      hints: Object.fromEntries(hintMap),
      feedback: Object.fromEntries(feedbackMap),
    };
    return JSON.stringify(data, null, 2);
  }, [lines, hintMap, feedbackMap]);

  // Import notebook from JSON with validation
  const importJSON = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);

      // Validate structure
      if (!data.lines || !Array.isArray(data.lines)) {
        throw new Error("Invalid format: missing lines array");
      }

      if (data.lines.length === 0) {
        throw new Error("Invalid format: empty lines array");
      }

      // Validate each line
      const validModes: LineMode[] = ["math", "text", "header", "image", "break"];
      const validatedLines: MathLine[] = [];

      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];

        // Required fields
        if (typeof line.id !== "string" || !line.id) {
          throw new Error(`Line ${i}: missing or invalid id`);
        }
        if (typeof line.content !== "string") {
          throw new Error(`Line ${i}: missing or invalid content`);
        }
        if (!validModes.includes(line.mode)) {
          throw new Error(`Line ${i}: invalid mode "${line.mode}"`);
        }

        // Optional isProblem field - default to false if missing
        const isProblem = typeof line.isProblem === "boolean" ? line.isProblem : false;

        validatedLines.push({
          id: line.id,
          content: line.content,
          mode: line.mode,
          isProblem,
        });
      }

      // All valid - update state
      setLines(validatedLines);

      // Restore hints if present
      if (data.hints && typeof data.hints === "object") {
        setHintMap(new Map(Object.entries(data.hints)));
      } else {
        setHintMap(new Map());
      }

      // Restore feedback if present
      if (data.feedback && typeof data.feedback === "object") {
        setFeedbackMap(new Map(Object.entries(data.feedback)));
      } else {
        setFeedbackMap(new Map());
      }
    } catch (e) {
      console.error("Import failed:", e);
      alert("Invalid notebook file. Starting with empty notebook.");
      setLines([{ id: generateId(), content: "", mode: "text", isProblem: false }]);
      setHintMap(new Map());
      setFeedbackMap(new Map());
    }
  }, []);

  // Export button handler - downloads JSON file
  const handleExport = useCallback(() => {
    const json = exportJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Use header content as filename if first line is a header
    let filename = "notebook";
    if (lines[0]?.mode === "header" && lines[0].content.trim()) {
      // Sanitize: remove characters that are problematic in filenames
      filename = lines[0].content.trim().replace(/[/\\:*?"<>|]/g, "");
    }
    a.download = `${filename}.json`;

    a.click();
    URL.revokeObjectURL(url);
  }, [exportJSON, lines]);

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
      setFeedbackMap(new Map());
    }
  }, []);

  // Clear button handler - removes everything
  const handleClear = useCallback(() => {
    if (confirm("Clear all content?")) {
      setLines([{ id: generateId(), content: "", mode: "text" as LineMode, isProblem: false }]);
      setFeedbackMap(new Map());
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
    const feedback = feedbackMap.get(line.id) || null;
    const hint = hintMap.get(line.id) || null;
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
      onToggleProblem: handleToggleProblem,
      onCheckReasoning: handleCheckReasoning,
      isChecking: checkingLineId === line.id,
      feedback: null, // Feedback rendered separately below
      onDismissFeedback: handleDismissFeedback,
      onGetHint: handleGetHint,
      isLoadingHint: loadingHintLineId === line.id,
      hint: null, // Hint rendered separately below
      onDismissHint: handleDismissHint,
    };

    let lineComponent;
    if (line.mode === "text") {
      lineComponent = <TextLine {...commonProps} />;
    } else if (line.mode === "header") {
      lineComponent = <HeaderLine {...commonProps} />;
    } else if (line.mode === "image") {
      lineComponent = <ImageLine {...commonProps} />;
    } else if (line.mode === "break") {
      lineComponent = <BreakLine {...commonProps} />;
    } else {
      lineComponent = <MathLineComponent {...commonProps} />;
    }

    return (
      <div key={line.id} className="line-wrapper">
        {lineComponent}
        {feedback && (
          <div className={`feedback-display ${feedback.status === "ok" ? "feedback-ok" : "feedback-issue"}`}>
            <span className="feedback-icon">{feedback.status === "ok" ? "✓" : "✗"}</span>
            <div className="feedback-content">
              <math-field read-only>{(feedback.latex || (feedback.status === "ok" ? "\\text{All steps valid.}" : "\\text{Error in reasoning.}")).replace(/\\\\/g, " ")}</math-field>
            </div>
            <button className="feedback-dismiss" onClick={() => handleDismissFeedback(line.id)}>×</button>
          </div>
        )}
        {hint && (
          <div className="hint-display" style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "10px 14px",
            fontSize: 14,
            borderRadius: 4,
            borderLeft: "3px solid #f59e0b",
            margin: "4px 24px 8px 76px",
            background: "#fffbeb",
            color: "#374151",
          }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 2 }}>💡</span>
            <div style={{ flex: 1, minWidth: 0, overflowX: "auto", overflowY: "hidden" }}>
              <math-field read-only style={{ fontSize: 15 }}>{hint.replace(/\\\\/g, " ")}</math-field>
            </div>
            <button
              onClick={() => handleDismissHint(line.id)}
              style={{
                padding: 4,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 16,
                color: "#bbb",
                flexShrink: 0,
                lineHeight: 1,
              }}
            >×</button>
          </div>
        )}
      </div>
    );
  };

  if (loadingTemplate || !mathLiveReady) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <p className="text-gray-400">{loadingTemplate ? "Loading template..." : "Loading..."}</p>
      </div>
    );
  }

  if (minimal) {
    return (
      <div className="notebook-container notebook-minimal">
        <div
          ref={containerRef}
          className="ruled-paper"
          onClick={handleContainerClick}
        >
          {lines.map((line, index) => renderLine(line, index))}
        </div>
      </div>
    );
  }

  return (
    <div className="notebook-container">
      <div className="notebook-toolbar">
        <a
          href="/"
          style={{ padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: "13px", color: "#999", textDecoration: "none" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#666"; e.currentTarget.style.textDecoration = "underline"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#999"; e.currentTarget.style.textDecoration = "none"; }}
        >Home</a>
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
        <div className="notebook-hint">Type LaTeX directly · Tab to switch modes · Shift+Enter for line break · ? for hints</div>
        {lines.map((line, index) => renderLine(line, index))}
      </div>
    </div>
  );
}
