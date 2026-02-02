"use client";

import { useEffect, useState, type ReactNode } from "react";

interface MathLiveProviderProps {
  children: ReactNode;
}

export default function MathLiveProvider({ children }: MathLiveProviderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    import("mathlive").then((module) => {
      module.MathfieldElement.fontsDirectory = "https://unpkg.com/mathlive/fonts/";
      setReady(true);
    });
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
