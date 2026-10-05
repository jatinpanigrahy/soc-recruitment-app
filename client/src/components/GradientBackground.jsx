/**
 * GradientBackground Component
 *
 * Renders an animated ambient violet and blue gradient blob backdrop.
 * Positioned behind all page content via fixed layering with pointer-events disabled
 * to enhance showcase glassmorphism aesthetics.
 */

import React from "react";

export default function GradientBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none"
    >
      {/* Primary top-left violet orb */}
      <div className="absolute -top-32 -left-32 w-96 h-96 sm:w-[32rem] sm:h-[32rem] rounded-full bg-violet-600/20 dark:bg-violet-600/25 blur-3xl animate-pulse" />

      {/* Secondary top-right blue/indigo orb */}
      <div
        className="absolute top-20 -right-24 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-blue-600/15 dark:bg-indigo-500/20 blur-3xl"
        style={{ animationDuration: "8s" }}
      />

      {/* Tertiary center-bottom accent violet orb */}
      <div
        className="absolute bottom-10 left-1/3 w-72 h-72 sm:w-[26rem] sm:h-[26rem] rounded-full bg-purple-600/15 dark:bg-purple-600/20 blur-3xl"
        style={{ animationDuration: "10s" }}
      />

      {/* Subtle radial ambient vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/40 to-slate-50 dark:via-slate-950/40 dark:to-slate-950" />
    </div>
  );
}
