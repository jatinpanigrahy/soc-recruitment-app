/**
 * ViewToggle Component
 *
 * An iOS-style segmented pill control allowing users to switch between
 * Grid (portrait cards) and Feed (horizontal landscape cards) layouts.
 */

import React from "react";
import { LayoutGrid, List } from "lucide-react";

/**
 * @param {Object} props
 * @param {'grid' | 'feed'} props.viewMode - Current active layout mode
 * @param {(mode: 'grid' | 'feed') => void} props.onChange - Mode change callback handler
 */
export default function ViewToggle({ viewMode = "grid", onChange }) {
  return (
    <div
      role="group"
      aria-label="Layout view mode"
      className="inline-flex items-center p-1 rounded-full bg-slate-200/70 dark:bg-white/10 backdrop-blur-md border border-slate-300/50 dark:border-white/10 transition-colors"
    >
      {/* Grid view option */}
      <button
        type="button"
        aria-pressed={viewMode === "grid"}
        onClick={() => onChange?.("grid")}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          viewMode === "grid"
            ? "bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        <span>Grid</span>
      </button>

      {/* Feed view option */}
      <button
        type="button"
        aria-pressed={viewMode === "feed"}
        onClick={() => onChange?.("feed")}
        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
          viewMode === "feed"
            ? "bg-white dark:bg-violet-600 text-slate-900 dark:text-white shadow-sm"
            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        }`}
      >
        <List className="w-3.5 h-3.5" />
        <span>Feed</span>
      </button>
    </div>
  );
}
