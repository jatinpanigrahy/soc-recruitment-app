/**
 * QuizPage Component
 *
 * "Find Your Fit" interactive campus personality and interest quiz.
 * Features:
 * - Dynamic questionnaire driven by quizQuestions.json.
 * - Step-by-step state machine with visual progress indicators and smooth transitions.
 * - Weighted affinity scoring engine calculating match distributions across
 *   Technical, Cultural, Literary, Sports, Music, and Dance categories.
 * - Automated recommendation retrieval for the winning category via axiosInstance.
 * - Glassmorphic presentation using the Pulse design system (violet-500 accents)
 *   and SocietyCard integration.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../api/axiosInstance";
import Navbar from "../components/Navbar";
import SocietyCard from "../components/SocietyCard";
import quizQuestions from "../data/quizQuestions.json";
import { getCategoryColor } from "../utils/categoryColors";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Compass,
  CheckCircle2,
  Code2,
  Palette,
  BookOpen,
  Trophy,
  Music2,
  Activity,
  Layers,
  HelpCircle,
} from "lucide-react";

/** Category descriptor metadata for post-quiz results */
const CATEGORY_META = {
  Technical: {
    icon: Code2,
    badge: "Innovator & Builder",
    description:
      "You thrive on logic, system architecture, engineering challenges, and building technologies that automate and solve real-world problems.",
    gradient: "from-blue-600 to-cyan-500",
  },
  Cultural: {
    icon: Palette,
    badge: "Creative Director & Performer",
    description:
      "You bring stories, stagecraft, artistic vision, and traditions alive, fostering belonging and vibrant campus celebrations.",
    gradient: "from-purple-600 to-fuchsia-500",
  },
  Literary: {
    icon: BookOpen,
    badge: "Wordsmith & Orator",
    description:
      "You have a natural mastery over words, compelling arguments, critical debate, and storytelling that sparks intellectual discovery.",
    gradient: "from-amber-600 to-orange-500",
  },
  Sports: {
    icon: Trophy,
    badge: "Athlete & Strategist",
    description:
      "Driven by physical endurance, competitive excellence, athletic grit, and high-stakes teamwork that pushes limits.",
    gradient: "from-emerald-600 to-teal-500",
  },
  Music: {
    icon: Music2,
    badge: "Soundcrafter & Vocalist",
    description:
      "Captivated by rhythm, acoustic harmony, instrument mastery, and live soundscapes that connect human emotions.",
    gradient: "from-rose-600 to-pink-500",
  },
  Dance: {
    icon: Activity,
    badge: "Kinetic Artist & Choreographer",
    description:
      "Expressing rhythm through body movement, syncopated synchronization, stage charisma, and high-voltage performance.",
    gradient: "from-pink-600 to-purple-500",
  },
};

export default function QuizPage() {
  const [stage, setStage] = useState("intro"); // 'intro' | 'quiz' | 'results'
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({}); // { [stepIndex]: optionId }
  const [winningCategory, setWinningCategory] = useState(null);
  const [scoreBreakdown, setScoreBreakdown] = useState({});
  const [recommendedSocieties, setRecommendedSocieties] = useState([]);
  const [loadingSocieties, setLoadingSocieties] = useState(false);
  const [errorSocieties, setErrorSocieties] = useState(null);

  const totalQuestions = quizQuestions.length;
  const currentQuestion = quizQuestions[currentStep];
  const selectedOptionId = answers[currentStep];

  // Select an option for current question
  const handleSelectOption = (optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [currentStep]: optionId,
    }));
  };

  // Move to next step or complete quiz
  const handleNext = () => {
    if (!selectedOptionId) return;

    if (currentStep < totalQuestions - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      finishQuiz();
    }
  };

  // Move back to previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Tally scores and transition to results
  const finishQuiz = () => {
    const scores = {
      Technical: 0,
      Cultural: 0,
      Literary: 0,
      Sports: 0,
      Music: 0,
      Dance: 0,
    };

    // Calculate aggregated weights
    quizQuestions.forEach((q, index) => {
      const chosenOptionId = answers[index];
      const option = q.options.find((opt) => opt.id === chosenOptionId);
      if (option && option.weights) {
        Object.entries(option.weights).forEach(([cat, weight]) => {
          if (scores[cat] !== undefined) {
            scores[cat] += weight;
          }
        });
      }
    });

    // Find highest score
    let bestCat = "Technical";
    let maxVal = -1;
    Object.entries(scores).forEach(([cat, val]) => {
      if (val > maxVal) {
        maxVal = val;
        bestCat = cat;
      }
    });

    // Compute percentages
    const totalScorePoints = Object.values(scores).reduce((a, b) => a + b, 0);
    const breakdown = {};
    Object.entries(scores).forEach(([cat, val]) => {
      breakdown[cat] = {
        score: val,
        percentage:
          totalScorePoints > 0 ? Math.round((val / totalScorePoints) * 100) : 0,
      };
    });

    setWinningCategory(bestCat);
    setScoreBreakdown(breakdown);
    setStage("results");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fetch recommended societies once winningCategory is resolved
  useEffect(() => {
    if (stage !== "results" || !winningCategory) return;

    let isMounted = true;
    const fetchRecommended = async () => {
      setLoadingSocieties(true);
      setErrorSocieties(null);
      try {
        const response = await axiosInstance.get("/societies", {
          params: { category: winningCategory },
        });
        if (isMounted) {
          setRecommendedSocieties(response.data?.data || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load recommended societies:", err);
          setErrorSocieties("Could not load recommendations. Please try again.");
        }
      } finally {
        if (isMounted) setLoadingSocieties(false);
      }
    };

    fetchRecommended();

    return () => {
      isMounted = false;
    };
  }, [stage, winningCategory]);

  // Reset quiz to initial state
  const handleRetakeQuiz = () => {
    setAnswers({});
    setCurrentStep(0);
    setWinningCategory(null);
    setScoreBreakdown({});
    setRecommendedSocieties([]);
    setErrorSocieties(null);
    setStage("quiz");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const progressPercentage = Math.round(
    ((currentStep + 1) / totalQuestions) * 100
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ===================== INTRO STAGE ===================== */}
        {stage === "intro" && (
          <div className="max-w-2xl mx-auto text-center py-6 sm:py-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/20 mb-6 shadow-sm">
              <Compass className="w-4 h-4 animate-spin-slow" />
              <span>Personalized Campus Discovery</span>
            </div>

            <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
              Find Your Fit on Campus
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
              Unsure which student society matches your interests, talents, and
              vibe? Answer {totalQuestions} quick scenario questions and discover
              your top club affinity and tailored recommendations.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-10 text-left">
              {[
                { title: "2 Minutes", desc: "Short & engaging questions" },
                { title: "6 Categories", desc: "Tech, Arts, Sports & more" },
                { title: "Instant Match", desc: "Direct recruitment links" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-white/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 backdrop-blur-sm"
                >
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-display">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Launch CTA */}
            <button
              type="button"
              onClick={() => setStage("quiz")}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-semibold text-sm sm:text-base shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
            >
              <span>Start Discovery Quiz</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ===================== QUIZ STAGE ===================== */}
        {stage === "quiz" && (
          <div className="max-w-3xl mx-auto">
            {/* Header progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                <span>
                  Question {currentStep + 1} of {totalQuestions}
                </span>
                <span>{progressPercentage}% Complete</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Current Question Surface */}
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="mb-6">
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Scenario #{currentStep + 1}
                </span>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white mt-1.5 leading-snug">
                  {currentQuestion.question}
                </h2>
                {currentQuestion.subtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                    {currentQuestion.subtitle}
                  </p>
                )}
              </div>

              {/* Options Stack */}
              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full text-left p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                        isSelected
                          ? "bg-violet-50/90 dark:bg-violet-950/40 border-violet-500 ring-2 ring-violet-500/20 text-slate-900 dark:text-white shadow-sm"
                          : "bg-white/40 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "border-violet-600 bg-violet-600 text-white"
                              : "border-slate-300 dark:border-white/20"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-white" />
                          )}
                        </div>
                        <span className="text-sm sm:text-base font-medium leading-relaxed">
                          {option.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Nav Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                    currentStep === 0
                      ? "opacity-30 cursor-not-allowed text-slate-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!selectedOptionId}
                  className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
                    selectedOptionId
                      ? "bg-violet-600 hover:bg-violet-700 active:scale-95 text-white shadow-violet-600/20"
                      : "opacity-40 cursor-not-allowed bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-slate-400 shadow-none"
                  }`}
                >
                  <span>
                    {currentStep === totalQuestions - 1
                      ? "See My Fit"
                      : "Next Question"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== RESULTS STAGE ===================== */}
        {stage === "results" && winningCategory && (
          <div className="space-y-10 animate-fade-in">
            {/* Top Match Hero Card */}
            {(() => {
              const meta = CATEGORY_META[winningCategory] || CATEGORY_META.Technical;
              const MetaIcon = meta.icon;
              const categoryStyle = getCategoryColor(winningCategory);
              const winningPercent = scoreBreakdown[winningCategory]?.percentage || 0;

              return (
                <div className="relative overflow-hidden bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-slate-200/60 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-sm">
                  {/* Subtle decorative glow */}
                  <div
                    className={`absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gradient-to-br ${meta.gradient} opacity-15 blur-3xl pointer-events-none`}
                  />

                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2.5 mb-3">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full border ${categoryStyle.bg} ${categoryStyle.text}`}
                        >
                          {winningCategory} Domain
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                          {winningPercent}% Match Affinity
                        </span>
                      </div>

                      <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-slate-900 dark:text-white tracking-tight">
                        Your Fit: {meta.badge}
                      </h1>

                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-2.5 max-w-2xl leading-relaxed">
                        {meta.description}
                      </p>
                    </div>

                    {/* Category Icon Badge */}
                    <div className="flex-shrink-0 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-xl shadow-violet-500/25">
                      <MetaIcon className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                  </div>

                  {/* Affinity Breakdown Grid */}
                  <div className="mt-8 pt-8 border-t border-slate-200/60 dark:border-white/10">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                      Category Affinity Breakdown
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {Object.entries(scoreBreakdown).map(([cat, data]) => {
                        const isWinner = cat === winningCategory;
                        return (
                          <div
                            key={cat}
                            className={`p-3 rounded-2xl border transition-all ${
                              isWinner
                                ? "bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/40"
                                : "bg-white/40 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/10"
                            }`}
                          >
                            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                              {cat}
                            </div>
                            <div className="font-display font-bold text-lg text-slate-900 dark:text-white mt-0.5">
                              {data.percentage}%
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/10 mt-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isWinner
                                    ? "bg-violet-600"
                                    : "bg-slate-400 dark:bg-slate-600"
                                }`}
                                style={{ width: `${data.percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Recommended Societies Showcase */}
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-500" />
                    <span>Recommended Societies in {winningCategory}</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Explore active student clubs matching your quiz results.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRetakeQuiz}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 transition-all cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Quiz</span>
                  </button>
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800/40 transition-all"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Browse All Clubs</span>
                  </Link>
                </div>
              </div>

              {/* State: Loading */}
              {loadingSocieties && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-56 rounded-2xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 animate-pulse p-6"
                    />
                  ))}
                </div>
              )}

              {/* State: Error */}
              {!loadingSocieties && errorSocieties && (
                <div className="p-8 text-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
                  <p className="text-sm font-medium">{errorSocieties}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setStage("results");
                    }}
                    className="mt-3 text-xs font-semibold underline cursor-pointer"
                  >
                    Try reloading
                  </button>
                </div>
              )}

              {/* State: Empty Matches */}
              {!loadingSocieties &&
                !errorSocieties &&
                recommendedSocieties.length === 0 && (
                  <div className="text-center py-12 px-4 rounded-3xl bg-white/40 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 backdrop-blur-sm">
                    <HelpCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <h3 className="font-display font-bold text-lg text-slate-900 dark:text-white">
                      No active societies listed under {winningCategory}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-6">
                      Campus societies open recruitments throughout the semester.
                      Browse other categories or check back soon!
                    </p>
                    <Link
                      to="/"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold shadow-sm transition-all"
                    >
                      <span>Explore All Societies</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

              {/* State: Render Recommendations */}
              {!loadingSocieties &&
                !errorSocieties &&
                recommendedSocieties.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendedSocieties.map((society) => (
                      <SocietyCard
                        key={society._id}
                        society={society}
                        viewMode="grid"
                      />
                    ))}
                  </div>
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
