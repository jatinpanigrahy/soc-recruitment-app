/**
 * ToastNotification Component
 *
 * Transient banner component for displaying success, error, info, or warning messages.
 * Automatically dismisses after ~3 seconds (or custom duration) and provides a manual close button.
 * Uses clean solid surfaces following the Pulse design system.
 *
 * @param {Object} props
 * @param {string} props.message - Notification message content.
 * @param {'success' | 'error' | 'info' | 'warning'} [props.type='success'] - Notification style variant.
 * @param {number} [props.duration=3000] - Lifespan in milliseconds before auto-dismissal.
 * @param {() => void} props.onClose - Callback invoked upon dismissal.
 * @returns {React.ReactElement | null}
 */

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export default function ToastNotification({
  message,
  type = 'success',
  duration = 3000,
  onClose,
}) {
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  // Variant styling configurations
  const variantStyles = {
    success: {
      border: 'border-emerald-500/30 dark:border-emerald-500/40',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      text: 'text-emerald-900 dark:text-emerald-100',
      shadow: 'shadow-emerald-500/10',
      icon: CheckCircle2,
    },
    error: {
      border: 'border-rose-500/30 dark:border-rose-500/40',
      badgeBg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400',
      text: 'text-rose-900 dark:text-rose-100',
      shadow: 'shadow-rose-500/10',
      icon: AlertCircle,
    },
    warning: {
      border: 'border-amber-500/30 dark:border-amber-500/40',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
      text: 'text-amber-900 dark:text-amber-100',
      shadow: 'shadow-amber-500/10',
      icon: AlertTriangle,
    },
    info: {
      border: 'border-violet-500/30 dark:border-violet-500/40',
      badgeBg: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400',
      text: 'text-violet-900 dark:text-violet-100',
      shadow: 'shadow-violet-500/10',
      icon: Info,
    },
  };

  const style = variantStyles[type] || variantStyles.success;
  const IconComponent = style.icon;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-5 right-5 z-50 max-w-md w-full sm:w-auto flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border ${style.border} shadow-lg ${style.shadow} transition-all transform animate-in fade-in slide-in-from-top-3 duration-200`}
    >
      <div className={`p-1.5 rounded-xl ${style.badgeBg} flex-shrink-0`}>
        <IconComponent className="w-5 h-5" />
      </div>

      <div className="flex-1 pr-2">
        <p className={`text-sm font-medium leading-snug ${style.text}`}>
          {message}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
