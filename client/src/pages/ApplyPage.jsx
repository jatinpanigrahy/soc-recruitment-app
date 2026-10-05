/**
 * ApplyPage Component
 *
 * Dynamic recruitment application form for students.
 * Features:
 * 1. Fetches society details (GET /societies/:societyId).
 * 2. Renders an interactive role selector from society.openRoles.
 * 3. Dynamically merges society.generalQuestions with the chosen role's questions.
 * 4. Formats submission payload as:
 *    { societyId, roleAppliedFor, answers: [{ question, answer }] }
 *    and dispatches POST /applications.
 * 5. Provides comprehensive loading, disabled, validation, and toast notification states.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { axiosInstance } from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import GradientBackground from '../components/GradientBackground';
import ToastNotification from '../components/ToastNotification';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';

export default function ApplyPage() {
  const { societyId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Society data state
  const [society, setSociety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Application form state
  const [selectedRoleTitle, setSelectedRoleTitle] = useState('');
  const [answersMap, setAnswersMap] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Toast feedback state
  const [toast, setToast] = useState(null); // { message, type }

  // Fetch society details on mount
  useEffect(() => {
    let isMounted = true;

    const fetchSociety = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await axiosInstance.get(`/societies/${societyId}`);
        if (!isMounted) return;

        const data = res.data?.data;
        if (!data) {
          throw new Error('Society record not found');
        }

        setSociety(data);

        // Pre-select role from search param if available and matched, else default to first open role
        const roleFromQuery = searchParams.get('role');
        const availableRoles = data.openRoles || [];

        const matchedRole = availableRoles.find(
          (r) => r.title.toLowerCase() === (roleFromQuery || '').toLowerCase()
        );

        if (matchedRole) {
          setSelectedRoleTitle(matchedRole.title);
        } else if (availableRoles.length > 0) {
          setSelectedRoleTitle(availableRoles[0].title);
        }
      } catch (err) {
        console.error('Error fetching society details:', err);
        if (isMounted) {
          setFetchError(
            err.response?.data?.message ||
              'Could not load society information. It may not exist or has been removed.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (societyId) {
      fetchSociety();
    }

    return () => {
      isMounted = false;
    };
  }, [societyId, searchParams]);

  // Find currently selected open role document
  const selectedRole = useMemo(() => {
    if (!society?.openRoles) return null;
    return society.openRoles.find((r) => r.title === selectedRoleTitle) || null;
  }, [society, selectedRoleTitle]);

  // Combine general society questions and role-specific questions
  const combinedQuestions = useMemo(() => {
    if (!society) return [];

    const generalList = Array.isArray(society.generalQuestions)
      ? society.generalQuestions
      : [];

    const roleSpecificList = Array.isArray(selectedRole?.questions)
      ? selectedRole.questions
      : [];

    // Tag items for clear visual categorization in form
    const list = [
      ...generalList.map((q) => ({ questionText: q, category: 'general' })),
      ...roleSpecificList.map((q) => ({ questionText: q, category: 'role' })),
    ];

    return list;
  }, [society, selectedRole]);

  // Evaluate recruitment deadline
  const deadlineDate = society?.deadline ? new Date(society.deadline) : null;
  const isDeadlinePassed = deadlineDate ? Date.now() > deadlineDate.getTime() : false;

  // Handle answer change for a specific question text
  const handleAnswerChange = (questionText, value) => {
    setAnswersMap((prev) => ({
      ...prev,
      [questionText]: value,
    }));
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (isDeadlinePassed) {
      setToast({
        message: 'Recruitment deadline has passed. Applications are closed.',
        type: 'error',
      });
      return;
    }

    if (!selectedRoleTitle) {
      setSubmitError('Please select a position to apply for.');
      setToast({
        message: 'Please select a position to apply for.',
        type: 'warning',
      });
      return;
    }

    // Format submission payload: { societyId, roleAppliedFor, answers: [{ question, answer }] }
    const answersPayload = combinedQuestions.map(({ questionText }) => ({
      question: questionText,
      answer: (answersMap[questionText] || '').trim(),
    }));

    const payload = {
      societyId,
      roleAppliedFor: selectedRoleTitle,
      answers: answersPayload,
    };

    setIsSubmitting(true);

    try {
      await axiosInstance.post('/applications', payload);

      setToast({
        message: 'Application submitted successfully! Redirecting to your dashboard...',
        type: 'success',
      });

      // Redirect to student dashboard after confirmation
      setTimeout(() => {
        navigate('/dashboard/student');
      }, 1500);
    } catch (err) {
      console.error('Application submission error:', err);
      const serverMessage =
        err.response?.data?.message || 'Failed to submit application. Please try again.';
      setSubmitError(serverMessage);
      setToast({
        message: serverMessage,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading State View
  if (loading) {
    return (
      <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <GradientBackground />
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-4">
            <Loader2 className="w-10 h-10 text-violet-600 dark:text-violet-400 animate-spin" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Loading recruitment application...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 2. Error / Society Not Found View
  if (fetchError || !society) {
    return (
      <div className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <GradientBackground />
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
              Application Unavailable
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {fetchError || 'Unable to locate recruitment details for this society.'}
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Societies
            </Link>
          </div>
        </main>
      </div>
    );
  }

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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="mb-6">
          <Link
            to={`/societies/${societyId}`}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to {society.name}
          </Link>
        </div>

        {/* Application Header Card */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-4">
              {society.logoUrl ? (
                <img
                  src={society.logoUrl}
                  alt={society.name}
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-violet-500/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center font-bold text-xl">
                  {society.name?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400 mb-1">
                  {society.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight">
                  {society.name}
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {society.tagline}
                </p>
              </div>
            </div>

            {/* Deadline status chip */}
            {deadlineDate && (
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  isDeadlinePassed
                    ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {isDeadlinePassed ? 'Closed on ' : 'Deadline: '}
                  {deadlineDate.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Deadline Warning Banner if recruitment is expired */}
          {isDeadlinePassed && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                  Recruitment has concluded
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  The application deadline for this recruitment cycle has passed. Submissions are no longer accepted.
                </p>
              </div>
            </div>
          )}

          {/* Submission Error Banner */}
          {submitError && (
            <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-500/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-200">
                  Submission Failed
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  {submitError}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Main Application Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Role Selection */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                  Position Selection
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select the team role you are applying to join
                </p>
              </div>
            </div>

            {society.openRoles && society.openRoles.length > 0 ? (
              <div className="space-y-4">
                {/* Role dropdown selector */}
                <div>
                  <label
                    htmlFor="role-select"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Select Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="role-select"
                    value={selectedRoleTitle}
                    onChange={(e) => setSelectedRoleTitle(e.target.value)}
                    disabled={isDeadlinePassed || isSubmitting}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {society.openRoles.map((role, idx) => (
                      <option key={idx} value={role.title}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Role Preview Box */}
                {selectedRole && (
                  <div className="p-4 rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        Role Overview
                      </span>
                    </div>
                    {selectedRole.description && (
                      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedRole.description}
                      </p>
                    )}
                    {selectedRole.requirements && (
                      <div className="flex items-start gap-2 pt-2 border-t border-violet-500/10 text-xs text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>Prerequisites:</strong> {selectedRole.requirements}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                General Recruitment Submission (No distinct departmental positions configured)
              </div>
            )}
          </section>

          {/* Section 2: Recruitment Questions */}
          <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                  Recruitment Questionnaire
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Please provide thoughtful responses to help the evaluation team learn about your skills
                </p>
              </div>
            </div>

            {combinedQuestions.length > 0 ? (
              <div className="space-y-6">
                {combinedQuestions.map(({ questionText, category }, index) => {
                  const answerVal = answersMap[questionText] || '';
                  return (
                    <div
                      key={index}
                      className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <label
                          htmlFor={`question-${index}`}
                          className="block text-sm font-semibold text-slate-900 dark:text-slate-100"
                        >
                          <span className="text-violet-600 dark:text-violet-400 mr-1.5">
                            Q{index + 1}.
                          </span>
                          {questionText}
                        </label>

                        <span
                          className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            category === 'role'
                              ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
                              : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 border-slate-300/40 dark:border-slate-600/40'
                          }`}
                        >
                          {category === 'role' ? 'Role Specific' : 'General'}
                        </span>
                      </div>

                      <textarea
                        id={`question-${index}`}
                        rows={4}
                        disabled={isDeadlinePassed || isSubmitting}
                        value={answerVal}
                        onChange={(e) => handleAnswerChange(questionText, e.target.value)}
                        placeholder="Write your response here..."
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all resize-y"
                      />

                      <div className="flex justify-end text-[11px] text-slate-400">
                        {answerVal.length} characters
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                No specific written questions are designated for this position. Click submit to record your candidacy.
              </div>
            )}
          </section>

          {/* Section 3: Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <Link
              to={`/societies/${societyId}`}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-sm text-center transition-all"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isDeadlinePassed || isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl font-semibold bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm shadow-md shadow-violet-600/25 active:scale-95 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
