/**
 * HomePage Component
 *
 * Primary public discovery page for campus societies. Provides live
 * name searching, category pill filtering, and a responsive grid layout
 * mapping individual society cards.
 */

import React, { useState, useEffect } from "react";
import api from "../api/axiosInstance";
import SocietyCard from "../components/SocietyCard";
import { Search } from "lucide-react";

/**
 * Filter categories aligned with the Society schema category enum.
 */
const CATEGORIES = ["All", "Technical", "Cultural", "Sports", "Literary"];

export default function HomePage() {
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Debounce search input by 250ms to prevent typing lag and network flooding
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch societies whenever category filter or debounced search changes
  useEffect(() => {
    let isMounted = true;
    const fetchSocieties = async () => {
      try {
        const res = await api.get("/societies", {
          params: {
            category: selectedCategory !== "All" ? selectedCategory : undefined,
            search: debouncedSearch || undefined,
          },
        });
        if (isMounted) {
          setSocieties(res.data.data || []);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Discover & Join <span className="text-emerald-600">Societies</span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Find your passion, develop leadership skills, and join student-led
          teams across campus.
        </p>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
        {/* Search Input Box */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search societies by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Society Grid, Loading Shimmer, or Empty Results State */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 animate-pulse">
          Loading campus societies...
        </div>
      ) : societies.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-8">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
            No societies found
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Try tweaking your search term or select another category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {societies.map((society) => (
            <SocietyCard key={society._id} society={society} />
          ))}
        </div>
      )}
    </div>
  );
}
