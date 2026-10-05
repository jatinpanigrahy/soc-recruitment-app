/**
 * SocietyCard Component
 *
 * Renders an individual society showcase card supporting two visual presentations:
 * 1. Grid Mode: A structured portrait card for multi-column discovery.
 * 2. Feed Mode: An expanded landscape card for detailed horizontal feed browsing.
 *
 * Features glassmorphic backdrop blurring, dynamic category color styling,
 * recruitment countdown badges, and navigation to the society detail page.
 */

import React from "react";
import { Link } from "react-router-dom";
import { Users, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { getCategoryColor } from "../utils/categoryColors";

/**
 * @param {Object} props
 * @param {Object} props.society - The society record
 * @param {'grid' | 'feed'} [props.viewMode] - Presentation layout mode
 */
export default function SocietyCard({ society, viewMode = "grid" }) {
  // Calculate remaining recruitment time in days
  const deadlineDate = society.deadline ? new Date(society.deadline) : null;
  const diff = deadlineDate ? deadlineDate - new Date() : 0;
  const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const isExpired = deadlineDate ? daysRemaining <= 0 : false;
  const isClosingSoon = !isExpired && daysRemaining <= 3;

  const categoryStyle = getCategoryColor(society.category);
  const openRolesCount = society.openRoles?.length || 0;

  // Render Feed (Landscape) presentation
  if (viewMode === "feed") {
    return (
      <div className="group relative bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-lg hover:border-violet-500/40 dark:hover:border-violet-500/30 transition-all duration-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        {/* Left column: Logo & details */}
        <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
          <img
            src={society.logoUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80"}
            alt={society.name}
            loading="lazy"
            decoding="async"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10"
          />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${categoryStyle.bg} ${categoryStyle.text}`}
              >
                {society.category}
              </span>

              {isExpired ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Closed
                </span>
              ) : isClosingSoon ? (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {daysRemaining}d left
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {daysRemaining}d left
                </span>
              )}
            </div>

            <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
              {society.name}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
              {society.tagline || society.description}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5 text-violet-500" />
                {openRolesCount} {openRolesCount === 1 ? "role" : "roles"} available
              </span>
            </div>
          </div>
        </div>

        {/* Right column: Action navigation CTA */}
        <div className="w-full md:w-auto flex md:flex-col items-center md:items-end justify-between gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-200/50 dark:border-white/5">
          <Link
            to={`/societies/${society._id}`}
            className="w-full md:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <span>View & Apply</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // Render Grid (Portrait) presentation
  return (
    <div className="group relative bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-violet-500/40 dark:hover:border-violet-500/30 transition-all duration-200 flex flex-col justify-between">
      <div>
        {/* Top metadata header */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${categoryStyle.bg} ${categoryStyle.text}`}
          >
            {society.category}
          </span>

          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {isExpired ? (
              <span className="text-rose-500 font-semibold">Closed</span>
            ) : isClosingSoon ? (
              <span className="text-amber-500 font-semibold">{daysRemaining}d left</span>
            ) : (
              `${daysRemaining}d left`
            )}
          </span>
        </div>

        {/* Core club branding and identity */}
        <div className="flex items-start gap-3.5 mb-4">
          <img
            src={society.logoUrl || "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80"}
            alt={society.name}
            loading="lazy"
            decoding="async"
            className="w-14 h-14 rounded-2xl object-cover flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10"
          />
          <div className="min-w-0">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-base group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
              {society.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1 leading-relaxed">
              {society.tagline || society.description}
            </p>
          </div>
        </div>
      </div>

      {/* Card footer actions */}
      <div className="pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-violet-500" />
          <span>{openRolesCount} open {openRolesCount === 1 ? "role" : "roles"}</span>
        </span>

        <Link
          to={`/societies/${society._id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
        >
          View & Apply
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
}