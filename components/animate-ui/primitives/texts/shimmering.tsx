"use client";

import React from 'react';
import { cn } from "@/lib/utils";

interface ShimmeringTextProps {
  text: string;
  wave?: boolean;
  duration?: number;
  className?: string;
}

export const ShimmeringText = ({
  text,
  wave = false,
  duration = 2,
  className,
}: ShimmeringTextProps) => {
  // If wave is true, split text into characters and apply delays
  if (wave) {
    const chars = Array.from(text);
    return (
      <span className={cn("inline-flex flex-wrap items-center", className)}>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shimmer-wave-anim {
            0%, 100% {
              color: rgba(15, 76, 146, 0.35);
              transform: translateY(0);
            }
            50% {
              color: rgba(15, 76, 146, 1);
              transform: translateY(-3px);
            }
          }
          .shimmer-wave-char {
            display: inline-block;
            white-space: pre;
            animation: shimmer-wave-anim ${duration}s ease-in-out infinite;
          }
        `}} />
        {chars.map((char, index) => (
          <span
            key={index}
            className="shimmer-wave-char"
            style={{
              animationDelay: `${(index * 0.08).toFixed(2)}s`
            }}
          >
            {char}
          </span>
        ))}
      </span>
    );
  }

  // Standard gradient shimmer using Polsek Blue scheme
  return (
    <span className={cn("relative inline-block overflow-hidden select-none", className)}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer-text-gradient {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .shimmer-text-gradient-effect {
          background: linear-gradient(
            to right,
            #0f4c92 20%,
            #3b82f6 40%,
            #60a5fa 60%,
            #0f4c92 80%
          );
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shimmer-text-gradient ${duration}s linear infinite;
        }
      `}} />
      <span className="shimmer-text-gradient-effect">
        {text}
      </span>
    </span>
  );
};
