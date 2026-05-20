"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
}

export function TextShimmer({
  children,
  className,
  duration = 2.4,
}: TextShimmerProps) {
  return (
    <span
      className={cn(
        "inline-block bg-[linear-gradient(90deg,#9ca3af_0%,#0f4c92_45%,#9ca3af_90%)] bg-[length:250%_100%] bg-clip-text text-transparent",
        className
      )}
      style={{
        animation: `text-shimmer ${duration}s linear infinite`,
      }}
    >
      <style jsx>{`
        @keyframes text-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      {children}
    </span>
  );
}
