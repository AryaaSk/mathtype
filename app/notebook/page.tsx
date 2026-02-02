"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import MathLiveProvider from "../components/MathLiveProvider";

const MathNotebook = dynamic(
  () => import("../components/MathNotebook/MathNotebook"),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <p className="text-gray-400">Loading editor...</p>
      </div>
    ),
  }
);

function NotebookContent() {
  const searchParams = useSearchParams();
  const templateSlug = searchParams.get("template");

  return <MathNotebook templateSlug={templateSlug} />;
}

export default function NotebookPage() {
  return (
    <main>
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
            <p className="text-gray-400">Loading...</p>
          </div>
        }
      >
        <MathLiveProvider>
          <NotebookContent />
        </MathLiveProvider>
      </Suspense>
    </main>
  );
}
