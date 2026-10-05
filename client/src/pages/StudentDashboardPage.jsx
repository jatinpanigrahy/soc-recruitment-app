/**
 * StudentDashboardPage Component
 *
 * Student Recruitment Portal.
 * Features:
 * 1. Fetches candidate applications via GET /applications/my.
 * 2. Background polling every 30 seconds to provide real-time recruitment updates.
 * 3. Renders application cards featuring `StatusBadge` with `displayForStudent={true}`.
 * 4. Gates the "Edit" button strictly on:
 *    `status === 'Pending'` AND `Date.now() < new Date(society.deadline).getTime()`.
 * 5. Provides an interactive Edit Application modal (PATCH /applications/:id).
 * 6. Visual recruitment timeline representing application lifecycle states.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import GradientBackground from '../components/GradientBackground';
import StatusBadge from '../components/StatusBadge';
import ToastNotification from '../components/ToastNotification';
import {
  Calendar,
  Clock,
  Edit3,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Building2,
  Sparkles,
  UserCheck,
  X,
  Save,
  Loader2,
  Inbox,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export default function StudentDashboardPage() {
  const { user } = useAuth();

  // Application state
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  // Filter state
  const [activeFilter, setActiveFilter] = useState('All'); // 'All' | 'Pending' | 'Shortlisted' | 'Accepted' | 'Rejected'

  // Expandable cards state (array of application IDs whose details/answers are open)
  const [expandedCards, setExpandedCards] = useState({});

  // Edit Application Modal State
  const [editingApp, setEditingApp] = useState(null);
  const [editAnswers, setEditAnswers] = useState([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  /**
   * Fetch applicant's personal submissions from API.
   * @param {boolean} isSilent - If true, prevents full loading screen for polling.
   */
  const fetchApplications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    setError(null);

    try {
      const res = await axiosInstance.get('/applications/my');
      const apps = res.data?.data || [];
      setApplications(apps);
      setLastFetched(new Date());
    } catch (err) {
      console.error('Error fetching student applications:', err);
      if (!isSilent) {
        setError(
          err.response?.data?.message || 'Failed to load your applications. Please try again.'
        );
      }
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch and 30-second interval polling
  useEffect(() => {
    fetchApplications(false);

    const pollInterval = setInterval(() => {
      fetchApplications(true);
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollInterval);
  }, [fetchApplications]);

  // Toggle card details expansion
  const toggleExpandCard = (appId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  /**
   * Determine whether an application is eligible for editing.
   * Rule: Gate strictly on: `status === 'Pending'` AND `Date.now() < new Date(society.deadline).getTime()`.
   */
  const isApplicationEditable = (app) => {
    if (app.status !== 'Pending') return false;
    if (!app.society?.deadline) return false;

    const deadlineTimestamp = new Date(app.society.deadline).getTime();
    if (isNaN(deadlineTimestamp)) return false;

    return Date.now() < deadlineTimestamp;
  };

  // Open edit modal for an application
  const handleOpenEditModal = (app) => {
    setEditingApp(app);
    // Clone existing answers
    setEditAnswers(
      (app.answers || []).map((a) => ({
        question: a.question,
        answer: a.answer,
      }))
    );
    setEditModalError(null);
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setEditingApp(null);
    setEditAnswers([]);
    setEditModalError(null);
  };

  // Handle individual answer modification within edit modal
  const handleEditAnswerChange = (index, newAnswer) => {
    setEditAnswers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], answer: newAnswer };
      return next;
    });
  };

  // Submit edited application responses
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingApp) return;

    // Verify deadline condition prior to dispatch
    if (!isApplicationEditable(editingApp)) {
      setEditModalError('Recruitment for this society has closed or application is no longer pending.');
      return;
    }

    setIsSavingEdit(true);
    setEditModalError(null);

    try {
      const res = await axiosInstance.patch(`/applications/${editingApp._id}`, {
        answers: editAnswers,
      });

      // Update in local state
      const updatedApp = res.data?.data;
      setApplications((prev) =>
        prev.map((a) => (a._id === editingApp._id ? { ...a, ...updatedApp } : a))
      );

      setToast({
        message: 'Your application responses have been updated successfully!',
        type: 'success',
      });

      handleCloseEditModal();
    } catch (err) {
      console.error('Error updating application answers:', err);
      const msg = err.response?.data?.message || 'Failed to update application. Please try again.';
      setEditModalError(msg);
      setToast({
        message: msg,
        type: 'error',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Filtered applications list
  const filteredApplications = useMemo(() => {
    if (activeFilter === 'All') return applications;
    return applications.filter((app) => app.status === activeFilter);
  }, [applications, activeFilter]);

  // Aggregate status statistics
  const stats = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) => a.status === 'Pending').length;
    const shortlisted = applications.filter((a) => a.status === 'Shortlisted').length;
    const accepted = applications.filter((a) => a.status === 'Accepted').length;
    return { total, pending, shortlisted, accepted };
  }, [applications]);

  /**
   * Helper component: Visual Application Timeline
   * Renders the progressive status lifecycle for an application submission.
   */
  const ApplicationTimeline = ({ app }) => {
    const { status, submittedAt, createdAt } = app;
    const submitDate = submittedAt || createdAt;

    // Determine current stage index: 0=Submitted, 1=Under Review, 2=Decision
    let currentStage = 1; // Default to 'Under Review' when Pending
    if (status === 'Shortlisted') currentStage = 2;
    if (status === 'Accepted' || status === 'Rejected') currentStage = 3;

    return (
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Application Progress Timeline
        </h4>

        <div className="relative flex items-center justify-between w-full">
          {/* Timeline background track line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0" />

          {/* Active progress track bar */}
          <div
            className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-violet-600 transition-all duration-500 z-0"
            style={{
              width:
                currentStage === 1
                  ? '33%'
                  : currentStage === 2
                  ? '66%'
                  : '100%',
            }}
          />

          {/* Step 1: Application Submitted */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-sm">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-2">
              Submitted
            </span>
            <span className="text-[10px] text-slate-400">
              {submitDate
                ? new Date(submitDate).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'Recorded'}
            </span>
          </div>

          {/* Step 2: Under Review */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-sm transition-colors ${
                currentStage >= 1
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-2">
              Under Review
            </span>
            <span className="text-[10px] text-slate-400">
              {status === 'Pending' ? 'In Progress' : 'Completed'}
            </span>
          </div>

          {/* Step 3: Shortlist / Assessment */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-sm transition-colors ${
                status === 'Shortlisted'
                  ? 'bg-blue-600 text-white ring-blue-100 dark:ring-blue-950 animate-pulse'
                  : status === 'Accepted'
                  ? 'bg-violet-600 text-white'
                  : currentStage >= 2
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-2">
              Shortlist
            </span>
            <span className="text-[10px] text-slate-400">
              {status === 'Shortlisted'
                ? 'Candidate Selected'
                : status === 'Accepted'
                ? 'Passed'
                : 'Evaluation'}
            </span>
          </div>

          {/* Step 4: Final Outcome */}
          <div className="relative z-10 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-sm transition-colors ${
                status === 'Accepted'
                  ? 'bg-emerald-600 text-white'
                  : status === 'Rejected'
                  ? 'bg-rose-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {status === 'Accepted' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : status === 'Rejected' ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </div>
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 mt-2">
              {status === 'Accepted'
                ? 'Accepted'
                : status === 'Rejected'
                ? 'Not Selected'
                : 'Decision'}
            </span>
            <span className="text-[10px] text-slate-400">
              {status === 'Accepted'
                ? 'Welcome aboard!'
                : status === 'Rejected'
                ? 'Cycle Ended'
                : 'Awaiting'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <GradientBackground />
      <Navbar />

      {/* Transient Toast Notification */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Welcome Portal Header & Summary Stats */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Student Recruitment Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                My Applications
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Track your active candidacies, edit responses before recruitment cutoffs, and monitor status updates.
              </p>
            </div>

            {/* Refresh / Polling Indicator */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fetchApplications(false)}
                disabled={loading || refreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                title="Refresh application records"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${refreshing || loading ? 'animate-spin' : ''}`}
                />
                <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
              </button>

              <Link
                to="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-600/20 transition-all"
              >
                <span>Browse Clubs</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Submissions
              </div>
              <div className="text-2xl font-extrabold font-display text-slate-900 dark:text-white mt-1">
                {stats.total}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-500/20">
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400">
                Pending Review
              </div>
              <div className="text-2xl font-extrabold font-display text-amber-900 dark:text-amber-200 mt-1">
                {stats.pending}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400">
                Shortlisted
              </div>
              <div className="text-2xl font-extrabold font-display text-blue-900 dark:text-blue-200 mt-1">
                {stats.shortlisted}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20">
              <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                Accepted
              </div>
              <div className="text-2xl font-extrabold font-display text-emerald-900 dark:text-emerald-200 mt-1">
                {stats.accepted}
              </div>
            </div>
          </div>
        </section>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', 'Pending', 'Shortlisted', 'Accepted', 'Rejected'].map((filterTab) => (
            <button
              key={filterTab}
              type="button"
              onClick={() => setActiveFilter(filterTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === filterTab
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {filterTab === 'Rejected' ? 'Not Selected' : filterTab}
              {filterTab === 'All' && ` (${applications.length})`}
            </button>
          ))}
        </div>

        {/* Loading State Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-violet-600 dark:text-violet-400 animate-spin" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Retrieving your applications...
            </p>
          </div>
        )}

        {/* Error State Banner */}
        {error && !loading && (
          <div className="p-6 rounded-3xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">
              Unable to load applications
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-300 max-w-md mx-auto">
              {error}
            </p>
            <button
              type="button"
              onClick={() => fetchApplications(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State View */}
        {!loading && !error && filteredApplications.length === 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
              <Inbox className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
              {activeFilter === 'All'
                ? 'No applications submitted yet'
                : `No applications found with status "${activeFilter === 'Rejected' ? 'Not Selected' : activeFilter}"`}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {activeFilter === 'All'
                ? 'Discover campus clubs, technical societies, and cultural organizations to submit your candidacy.'
                : 'Try selecting a different filter above to view your other applications.'}
            </p>
            {activeFilter === 'All' && (
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 transition-all"
              >
                <span>Explore Open Societies</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        )}

        {/* Application Cards List */}
        {!loading && !error && filteredApplications.length > 0 && (
          <div className="space-y-6">
            {filteredApplications.map((app) => {
              const editable = isApplicationEditable(app);
              const isExpanded = !!expandedCards[app._id];
              const societyDeadline = app.society?.deadline
                ? new Date(app.society.deadline)
                : null;

              return (
                <div
                  key={app._id}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-all hover:border-slate-300 dark:hover:border-slate-700"
                >
                  {/* Card Header: Society Branding & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                      {app.society?.logoUrl ? (
                        <img
                          src={app.society.logoUrl}
                          alt={app.society.name}
                          className="w-14 h-14 rounded-2xl object-cover ring-2 ring-violet-500/10 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
                          {app.society?.name?.slice(0, 2).toUpperCase() || 'SC'}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-lg sm:text-xl font-bold font-display text-slate-900 dark:text-white">
                            {app.society?.name || 'Campus Society'}
                          </h2>
                          {/* Society detail link */}
                          {app.society?._id && (
                            <Link
                              to={`/societies/${app.society._id}`}
                              className="text-xs text-violet-600 dark:text-violet-400 hover:underline inline-flex items-center gap-1 font-medium"
                            >
                              View Club
                            </Link>
                          )}
                        </div>

                        <div className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
                          Position Applied: {app.roleAppliedFor}
                        </div>
                      </div>
                    </div>

                    {/* Status badge with displayForStudent={true} */}
                    <div className="flex items-center gap-3">
                      <StatusBadge status={app.status} displayForStudent={true} size="md" />

                      {/* Edit Button: Strictly gated on status === 'Pending' AND Date.now() < deadline */}
                      {editable && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(app)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-500/30 transition-all cursor-pointer shadow-xs"
                          title="Modify responses before recruitment deadline"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submission Meta Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        Submitted:{' '}
                        <strong>
                          {new Date(app.submittedAt || app.createdAt).toLocaleDateString(
                            undefined,
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </strong>
                      </span>
                    </div>

                    {societyDeadline && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                          Deadline:{' '}
                          <strong>
                            {societyDeadline.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </strong>
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>
                        Answers Provided: <strong>{app.answers?.length || 0}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Admin Feedback Note (if present) */}
                  {app.feedbackNote && (
                    <div className="p-4 rounded-2xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-500/20 space-y-1">
                      <div className="flex items-center gap-2 text-violet-700 dark:text-violet-300 text-xs font-bold">
                        <HelpCircle className="w-4 h-4" />
                        <span>Society Feedback / Instructions</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        {app.feedbackNote}
                      </p>
                    </div>
                  )}

                  {/* Visual Application Timeline */}
                  <ApplicationTimeline app={app} />

                  {/* Expandable Answers Section */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => toggleExpandCard(app._id)}
                      className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-violet-500" />
                        {isExpanded ? 'Hide Submitted Responses' : 'View Submitted Responses'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 pl-2 pr-2 animate-in fade-in duration-200">
                        {app.answers && app.answers.length > 0 ? (
                          app.answers.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5"
                            >
                              <div className="text-xs font-bold text-slate-900 dark:text-white">
                                <span className="text-violet-600 dark:text-violet-400 mr-1.5">
                                  Q{idx + 1}.
                                </span>
                                {item.question}
                              </div>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {item.answer || (
                                  <span className="italic text-slate-400">No response provided</span>
                                )}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 italic text-center py-2">
                            No question responses on record.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Edit Application Modal */}
      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                  Edit Application Responses
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingApp.society?.name} • Position: {editingApp.roleAppliedFor}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseEditModal}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Questions Form */}
            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Modal Error Notice */}
              {editModalError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 dark:text-rose-300">
                    {editModalError}
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-800 dark:text-amber-300">
                You may revise your answers as long as your application remains Pending and the recruitment deadline has not passed.
              </p>

              {editAnswers.map((item, index) => (
                <div key={index} className="space-y-2">
                  <label
                    htmlFor={`edit-q-${index}`}
                    className="block text-xs font-semibold text-slate-900 dark:text-slate-100"
                  >
                    <span className="text-violet-600 dark:text-violet-400 mr-1.5">
                      Q{index + 1}.
                    </span>
                    {item.question}
                  </label>
                  <textarea
                    id={`edit-q-${index}`}
                    rows={4}
                    value={item.answer}
                    onChange={(e) => handleEditAnswerChange(index, e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-y"
                    placeholder="Enter updated response..."
                  />
                </div>
              ))}

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/25 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Updates</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
