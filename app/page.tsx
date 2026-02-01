"use client";

/**
 * Math Notebook Page
 *
 * Full-screen MathLive-based math editor with ruled-paper styling.
 *
 * Features:
 * - Each line is an interactive MathLive field
 * - Paste LaTeX to auto-render (e.g., paste "\frac{a}{b}" to see a fraction)
 * - Press Enter to create new lines
 * - Arrow keys navigate between lines
 * - Type LaTeX commands (e.g., \int, \frac) for visual math
 *
 * The MathNotebook component is loaded dynamically with SSR disabled
 * because MathLive is a browser-only library.
 */

import dynamic from "next/dynamic";

// Dynamic import with SSR disabled - MathLive requires browser APIs
const MathNotebook = dynamic(
  () => import("./components/MathNotebook/MathNotebook"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <p className="text-gray-400">Loading editor...</p>
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main>
      <MathNotebook />
    </main>
  );
}
