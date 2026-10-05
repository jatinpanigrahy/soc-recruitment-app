/**
 * FilterTray Component
 *
 * Frosted-glass search bar and control tray featuring:
 * 1. Live text search input with clearing affordance.
 * 2. Horizontally scrollable category filtering pills.
 * 3. Sorting & status filter dropdown selector.
 */

import React from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";

const DEFAULT_CATEGORIES = [
  "All",
  "Technical",
  "Cultural",
  "Literary",
  "Sports",
  "Music",
  "Dance",
];

const SORT_OPTIONS = [
  { value: "deadline", label: "Deadline (Soonest)" },
  { value: "name_asc", label: "Name (A to Z)" },
  { value: "roles", label: "Most Open Roles" },
];

/**
 * @param {Object} props
 * @param {string} props.searchQuery - Current search query text
 * @param {(query: string) => void} props.onSearchChange - Search text update callback
 * @param {string} props.selectedCategory - Currently selected category filter
 * @param {(category: string) => void} props.onCategoryChange - Category update callback
 * @param {string} [props.sortBy] - Current active sort order
 * @param {(sort: string) => void} [props.onSortChange] - Sort order update callback
 * @param {string[]} [props.categories] - List of category labels
 */
export default function FilterTray({
  searchQuery = "",
  onSearchChange,
  selectedCategory = "All",
  onCategoryChange,
  sortBy = "deadline",
  onSortChange,
  categories = DEFAULT_CATEGORIES,
}) {
  return (
    <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top row: Frosted search bar & Filter/Sort selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search input container */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Search societies by name, field, or keywords..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange?.("")}
              aria-label="Clear search query"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort & filter dropdown selector */}
        {onSortChange && (
          <div className="relative sm:w-56 flex-shrink-0">
            <div className="relative">
              <SlidersHorizontal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => onSortChange?.(e.target.value)}
                aria-label="Sort societies"
                className="w-full pl-10 pr-8 py-2.5 appearance-none bg-slate-100/70 dark:bg-slate-900/90 border border-slate-200/60 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                ▼
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom row: Horizontally scrollable category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange?.(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/25 scale-[1.02]"
                  : "bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-white/10 border border-slate-200/40 dark:border-white/5"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}
