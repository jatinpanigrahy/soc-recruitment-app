/**
 * SocietyDetailPage Component
 *
 * Displays the comprehensive public profile for a single campus society.
 * Fetches club details by ID parameter, enforces recruitment cutoff deadlines,
 * lists available departmental positions and criteria, and provides the primary
 * application entry point.
 */

import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axiosInstance";
import {
  ArrowLeft,
  Calendar,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function SocietyDetailPage() {
  const { id } = useParams();
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch society record on component mount or URL parameter change
  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/societies/${id}`);
        setSociety(res.data.data);
      } catch (err) {
        console.error("Error loading society details:", err);
        setError("Failed to load society details. It may not exist.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Evaluate whether recruitment cutoff timestamp has elapsed
  const isExpired = society ? new Date() > new Date(society.deadline) : false;

  // Render loading placeholder while awaiting backend response
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-slate-400 animate-pulse">
        <p>Loading society details...</p>
      </div>
    );
  }

  // Render error notification if society not found or network failure
  if (error || !society) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <p className="text-red-600 dark:text-red-400 font-semibold">
          {error || "Society not found."}
        </p>
        <Link
          to="/"
          className="text-emerald-600 dark:text-emerald-400 underline mt-4 inline-block font-medium"
        >
          ← Return to Directory
        </Link>
      </div>
    );
  }

  // Render complete society profile layout
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Back navigation link */}
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all societies
      </Link>

      {/* Header banner: Branding, name, tagline, and deadline status */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={society.logoUrl}
            alt={society.name}
            className="w-20 h-20 rounded-2xl object-cover"
          />
          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
              {society.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2">
              {society.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {society.tagline}
            </p>
          </div>
        </div>

        {/* Deadline countdown & status indicator */}
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span>
            Deadline: {new Date(society.deadline).toLocaleDateString()}
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isExpired
                ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
            }`}
          >
            {isExpired ? "Closed" : "Active"}
          </span>
        </div>
      </div>

      {/* Narrative overview: Society background and mission */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
          About Our Society
        </h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
          {society.description}
        </p>
      </div>

      {/* Open Positions Section: Departmental roles and requirements */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <Briefcase className="w-5 h-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Open Positions ({society.openRoles?.length || 0})
          </h2>
        </div>

        {/* Departmental role cards */}
        <div className="space-y-4">
          {society.openRoles?.map((role, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/40"
            >
              <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                {role.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
                {role.description}
              </p>
              {role.requirements && (
                <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span>Requirements: {role.requirements}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Primary Call-to-Action: Dynamic apply button with deadline protection */}
      <div className="flex justify-end pt-4">
        {isExpired ? (
          <button
            disabled
            className="px-8 py-3.5 rounded-xl font-semibold bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400 cursor-not-allowed"
          >
            Recruitment Closed
          </button>
        ) : (
          <Link
            to={`/apply/${society._id}`}
            className="px-8 py-3.5 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02]"
          >
            Apply for a Position →
          </Link>
        )}
      </div>
    </div>
  );
}
