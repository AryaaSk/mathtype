"use client";

/**
 * CanvasOverlay Component
 *
 * A canvas overlay for freehand drawing/marking on top of the notebook.
 * - Pen tool: draw strokes with configurable color and width
 * - Eraser tool: remove strokes by clicking/dragging over them
 * - Supports mouse and touch input via Pointer Events API
 */

import { useEffect, useRef, useCallback, useState } from "react";
import type { DrawingStroke, StrokePoint, DrawingTool } from "./types";

interface CanvasOverlayProps {
  isActive: boolean;
  tool: DrawingTool;
  color: string;
  strokeWidth: number;
  strokes: DrawingStroke[];
  contentHeight: number;
  onStrokeAdd: (stroke: DrawingStroke) => void;
  onStrokeRemove: (id: string) => void;
}

function generateId(): string {
  return crypto.randomUUID();
}

export default function CanvasOverlay({
  isActive,
  tool,
  color,
  strokeWidth,
  strokes,
  contentHeight,
  onStrokeAdd,
  onStrokeRemove,
}: CanvasOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentStrokeRef = useRef<StrokePoint[]>([]);

  // Get canvas context with proper scaling for retina displays
  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  // Render all strokes to canvas
  const renderStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all stored strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width * dpr;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.moveTo(stroke.points[0].x * dpr, stroke.points[0].y * dpr);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * dpr, stroke.points[i].y * dpr);
      }
      ctx.stroke();
    });

    // Draw current stroke being drawn
    if (currentStrokeRef.current.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth * dpr;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const points = currentStrokeRef.current;
      ctx.moveTo(points[0].x * dpr, points[0].y * dpr);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x * dpr, points[i].y * dpr);
      }
      ctx.stroke();
    }
  }, [strokes, color, strokeWidth, getContext]);

  // Set up canvas size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = contentHeight * dpr;

    // Scale context to match
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    renderStrokes();
  }, [contentHeight, renderStrokes]);

  // Re-render when strokes change
  useEffect(() => {
    renderStrokes();
  }, [strokes, renderStrokes]);

  // Get point from pointer event
  const getPoint = (e: React.PointerEvent): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Check if a point is near a stroke (for eraser)
  const isPointNearStroke = (point: StrokePoint, stroke: DrawingStroke, threshold: number): boolean => {
    for (const strokePoint of stroke.points) {
      const dx = point.x - strokePoint.x;
      const dy = point.y - strokePoint.y;
      if (dx * dx + dy * dy < threshold * threshold) {
        return true;
      }
    }
    return false;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isActive) return;

    e.preventDefault();
    const point = getPoint(e);

    if (tool === "pen") {
      setIsDrawing(true);
      currentStrokeRef.current = [point];
      // Capture pointer for smooth drawing even when leaving canvas
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (tool === "eraser") {
      // Erase strokes near this point
      const threshold = 20;
      strokes.forEach((stroke) => {
        if (isPointNearStroke(point, stroke, threshold)) {
          onStrokeRemove(stroke.id);
        }
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isActive) return;

    const point = getPoint(e);

    if (tool === "pen" && isDrawing) {
      currentStrokeRef.current.push(point);
      renderStrokes();
    } else if (tool === "eraser" && e.buttons > 0) {
      // Erase while dragging
      const threshold = 20;
      strokes.forEach((stroke) => {
        if (isPointNearStroke(point, stroke, threshold)) {
          onStrokeRemove(stroke.id);
        }
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isActive || tool !== "pen" || !isDrawing) return;

    setIsDrawing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    // Save the stroke if it has enough points
    if (currentStrokeRef.current.length >= 2) {
      const newStroke: DrawingStroke = {
        id: generateId(),
        color,
        width: strokeWidth,
        points: [...currentStrokeRef.current],
      };
      onStrokeAdd(newStroke);
    }

    currentStrokeRef.current = [];
    renderStrokes();
  };

  return (
    <canvas
      ref={canvasRef}
      className={`canvas-overlay ${isActive ? "active" : "inactive"}`}
      style={{ height: contentHeight }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  );
}
