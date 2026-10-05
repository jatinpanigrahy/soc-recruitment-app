/**
 * HomePage Component
 *
 * Primary public showcase discovery page for campus societies.
 * Integrates:
 * - Ambient animated GradientBackground.
 * - Sticky frosted glass Navbar.
 * - Hero showcase banner with Plus Jakarta Sans typography.
 * - Frosted glass FilterTray with real-time search, category filtering, and sorting.
 * - iOS-style segmented ViewToggle supporting Grid and Feed displays.
 * - Responsive SocietyCard catalog with smooth animations and empty state handling.
 */

import React, { useState, useEffect, useMemo } from "react";
import api from "../api/axiosInstance";
import Navbar from "../components/Navbar";
import GradientBackground from "../components/GradientBackground";
import FilterTray from "../components/FilterTray";
import ViewToggle from "../components/ViewToggle";
import SocietyCard from "../components/SocietyCard";
import { Sparkles, Layers } from "lucide-react";

const CATEGORIES = [
  "All",
  "Technical",
  "Cultural",
  "Literary",
  "Sports",
  "Music",
  "Dance",
];

export default function HomePage() {
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("deadline");
  const [viewMode, setViewMode] = useState("grid");

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch societies from backend when category or search changes
  useEffect(() => {
    let isMounted = true;
    const fetchSocieties = async () => {
      setLoading(true);
      try {
        const res = await api.get("/societies", {
          params: {
            category: selectedCategory !== "All" ? selectedCategory : undefined,
            search: debouncedSearch || undefined,
          },
        });
        if (isMounted) {
          setSocieties(res.data?.data || []);
        }
      } catch (err) {
        console.error("Error fetching societies:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSocieties();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, debouncedSearch]);

  // Sort societies based on active sort selector
  const sortedSocieties = useMemo(() => {
    const items = [...societies];
    if (sortBy === "deadline") {
      return items.sort((a, b) => {
        const timeA = new Date(a.deadline || 0).getTime();
        const timeB = new Date(b.deadline || 0).getTime();
        return timeA - timeB;
      });
    }
    if (sortBy === "name_asc") {
      return items.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    if (sortBy === "roles") {
      return items.sort(
        (a, b) => (b.openRoles?.length || 0) - (a.openRoles?.length || 0)
      );
    }
    return items;
  }, [societies, sortBy]);

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 selection:bg-violet-500/30 selection:text-violet-200">
      {/* Ambient gradient blob backdrop */}
      <GradientBackground />

      {/* Sticky navigation header */}
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8 animate-fade-in">
        {/* Showcase Hero Section */}
        <section className="text-center max-w-3xl mx-auto space-y-4 pt-4 sm:pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/30 text-violet-600 dark:text-violet-400 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Campus Recruitment Season 2026</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Discover Your Next Team on{" "}
            <span className="bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Pulse
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Explore university clubs, explore open departmental positions, and
            submit your recruitment applications effortlessly.
          </p>
        </section>

        {/* Filter Tray Controls */}
        <section aria-label="Society Filters">
          <FilterTray
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            sortBy={sortBy}
            onSortChange={setSortBy}
            categories={CATEGORIES}
          />
        </section>

        {/* Header toolbar: Count indicator and View toggle */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
            <Layers className="w-4 h-4 text-violet-500" />
            <span>
              Showing{" "}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {sortedSocieties.length}
              </strong>{" "}
              {sortedSocieties.length === 1 ? "society" : "societies"}
            </span>
          </div>

          {/* Segmented layout mode toggle */}
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
        </div>

        {/* Catalog presentation: Grid or Feed */}
        <section aria-label="Society Directory">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((idx) => (
                <div
                  key={idx}
                  className="bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-slate-200/50 dark:border-white/10 rounded-2xl p-6 h-48 animate-pulse flex flex-col justify-between"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-5 w-20 bg-slate-200 dark:bg-white/10 rounded-full" />
                    <div className="h-4 w-14 bg-slate-200 dark:bg-white/10 rounded" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-200 dark:bg-white/10 rounded-2xl" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-white/10 rounded" />
                      <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-1/3 bg-slate-200 dark:bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : sortedSocieties.length === 0 ? (
            <div className="text-center py-20 bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-3xl border border-slate-200/60 dark:border-white/10 p-8 max-w-lg mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-500 mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="font-display font-bold text-lg text-slate-800 dark:text-slate-100">
                No societies found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                No societies match your current search terms or category filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
                className="mt-2 inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          ) : viewMode === "feed" ? (
            <div className="space-y-4">
              {sortedSocieties.map((society) => (
                <SocietyCard
                  key={society._id}
                  society={society}
                  viewMode="feed"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedSocieties.map((society) => (
                <SocietyCard
                  key={society._id}
                  society={society}
                  viewMode="grid"
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
