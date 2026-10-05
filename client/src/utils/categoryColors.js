/**
 * Category Color Palette Mapping
 *
 * Provides a pure utility function mapping category names to cohesive Tailwind
 * background and text color classes for pill badges and showcase chips.
 */

export const CATEGORY_COLORS = {
  Technical: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20 border-blue-500/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  Cultural: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20 border-purple-500/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  Literary: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  Sports: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  Music: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20 border-rose-500/30",
    text: "text-rose-600 dark:text-rose-400",
  },
  Dance: {
    bg: "bg-pink-500/10 dark:bg-pink-500/20 border-pink-500/30",
    text: "text-pink-600 dark:text-pink-400",
  },
  _default: {
    bg: "bg-violet-500/10 dark:bg-violet-500/20 border-violet-500/30",
    text: "text-violet-600 dark:text-violet-400",
  },
};

/**
 * Pure function mapping category strings to Tailwind color classes.
 *
 * @param {string} [category] - The society category name
 * @returns {{ bg: string, text: string }} Tailwind classes for background and text
 */
export function getCategoryColor(category) {
  if (!category || typeof category !== "string") {
    return CATEGORY_COLORS._default;
  }
  return CATEGORY_COLORS[category] || CATEGORY_COLORS._default;
}

export default getCategoryColor;
