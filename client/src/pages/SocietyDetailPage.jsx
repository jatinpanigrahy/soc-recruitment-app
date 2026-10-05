/**
 * SocietyDetailPage Component
 *
 * Detailed public profile page for a single campus society.
 * Features:
 * - Glassmorphism hero section displaying logo, name, tagline, and deadline countdown.
 * - Narrative about section with club overview.
 * - Glassmorphic departmental role cards with prerequisites and position details.
 * - Internal recruitment application link paired with an "Apply via External Form" fallback
 *   when an external website/form URL is present in `society.socialLinks.website`.
 */

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosInstance";
import Navbar from "../components/Navbar";
import GradientBackground from "../components/GradientBackground";
import { getCategoryColor } from "../utils/categoryColors";
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Globe,
} from "lucide-react";

export default function SocietyDetailPage() {
  const { id } = useParams();
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch society record by ID
  useEffect(() => {
    let isMounted = true;
    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/societies/${id}`);
        if (isMounted) {
          setSociety(res.data?.data || null);
        }
      } catch (err) {
        console.error("Error loading society details:", err);
        if (isMounted) {
          setError("Failed to load society details. It may not exist or has been removed.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Evaluate whether recruitment cutoff date has passed
  const deadlineDate = society?.deadline ? new Date(society.deadline) : null;
  const isExpired = deadlineDate ? new Date() > deadlineDate : false;
  const categoryStyle = getCategoryColor(society?.category);

  // Check for external form/website fallback link
  const externalFormUrl = society?.socialLinks?.website || null;

  // Render loading state
  if (loading) {
    return (
      <div className="relative min-h-screen text-slate-900 dark:text-slate-100">
        <GradientBackground />
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
          <div className="h-6 w-36 bg-slate-200 dark:bg-white/10 rounded" />
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-3xl p-8 h-48" />
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-3xl p-8 h-64" />
        </div>
      </div>
    );
  }

  // Render error notification if society not found
  if (error || !society) {
    return (
      <div className="relative min-h-screen text-slate-900 dark:text-slate-100">
        <GradientBackground />
        <Navbar />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-3xl p-8 shadow-sm space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Society Not Found
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {error || "The requested campus society could not be located."}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to Showcase
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100 selection:bg-violet-500/30 selection:text-violet-200">
      {/* Ambient background blur */}
      <GradientBackground />

      {/* Sticky navigation header */}
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8 animate-fade-in">
        {/* Navigation back link */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to directory</span>
        </Link>

        {/* Hero Section: Club branding, metadata, deadline status */}
        <section className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-white/10 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <img
              src={
                society.logoUrl ||
                "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80"
              }
              alt={society.name}
              loading="lazy"
              decoding="async"
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10 shadow-md"
            />
            <div>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${categoryStyle.bg} ${categoryStyle.text}`}
              >
                {society.category}
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {society.name}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                {society.tagline}
              </p>
            </div>
          </div>

          {/* Deadline indicator pill */}
          <div className="flex flex-col sm:items-end gap-1.5 flex-shrink-0 pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-200/50 dark:border-white/10 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                Deadline:{" "}
                {deadlineDate
                  ? deadlineDate.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not set"}
              </span>
            </div>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                isExpired
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {isExpired ? "Recruitment Closed" : "Recruiting Active"}
            </span>
          </div>
        </section>

        {/* Narrative Section: About the society */}
        <section className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-white/10 shadow-sm space-y-3">
          <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
            About Our Society
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {society.description || "No description provided."}
          </p>

          {/* Optional external link row */}
          {externalFormUrl && (
            <div className="pt-2">
              <a
                href={externalFormUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Visit Club Website</span>
              </a>
            </div>
          )}
        </section>

        {/* Open Positions Section: Departmental roles */}
        <section className="bg-white/70 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/60 dark:border-white/10 shadow-sm space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="font-display font-bold text-xl text-slate-900 dark:text-white">
              Open Positions ({society.openRoles?.length || 0})
            </h2>
          </div>

          {society.openRoles && society.openRoles.length > 0 ? (
            <div className="space-y-4">
              {society.openRoles.map((role, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl border border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 backdrop-blur-md transition-all hover:border-violet-500/30"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <h3 className="font-display font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                      {role.title}
                    </h3>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {role.description}
                  </p>

                  {role.requirements && (
                    <div className="mt-3.5 pt-3 border-t border-slate-200/40 dark:border-white/5 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                      <span>Requirements: {role.requirements}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 italic">
              No specific departmental roles listed at this time.
            </p>
          )}
        </section>

        {/* Primary & Fallback Call-To-Action Actions */}
        <section className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
          {isExpired ? (
            <button
              type="button"
              disabled
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-semibold bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed text-sm"
            >
              Recruitment Closed
            </button>
          ) : (
            <>
              {/* Optional external fallback application link */}
              {externalFormUrl && (
                <a
                  href={externalFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/20 border border-slate-300/60 dark:border-white/10 text-sm shadow-sm transition-all"
                >
                  <span>Apply via External Form</span>
                  <ExternalLink className="w-4 h-4 text-violet-500" />
                </a>
              )}

              {/* Primary internal platform application link */}
              <Link
                to={`/apply/${society._id}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-semibold bg-violet-600 hover:bg-violet-700 text-white text-sm shadow-lg shadow-violet-600/25 active:scale-95 transition-all"
              >
                <span>Apply for a Position</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
