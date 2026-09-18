/**
 * SocietyCard Component
 *
 * Renders an individual society catalog card displaying club branding,
 * category badge, dynamic recruitment deadline countdown, and open vacancies count.
 */

import React from "react";
import { Link } from "react-router-dom";
import { Users, Calendar, ArrowRight } from "lucide-react";

/**
 * @param {Object} props
 * @param {Object} props.society - The society data object
 */
function SocietyCard({ society }) {
  // Calculate remaining days until recruitment cutoff
  const diff = new Date(society.deadline) - new Date();
  const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between p-6">
      {/* Header metadata: Category badge & deadline status */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          {society.category}
        </span>
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {isExpired ? "Closed" : `${daysRemaining}d left`}
        </span>
      </div>

      {/* Core content: Club branding, title, and tagline */}
      <div className="flex items-start gap-4 mb-4">
        <img
          src={society.logoUrl}
          alt={society.name}
          className="w-14 h-14 rounded-xl object-cover"
        />
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
            {society.name}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
            {society.tagline}
          </p>
        </div>
      </div>

      {/* Footer actions: Open vacancies counter and detail navigation */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {society.openRoles?.length || 0} open roles
        </span>

        <Link
          to={`/societies/${society._id}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
        >
          View & Apply <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

export default SocietyCard;