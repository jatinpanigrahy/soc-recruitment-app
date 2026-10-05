/**
 * StatusBadge Component
 *
 * Renders a colored, styled badge indicating recruitment application status.
 *
 * Status Color Mapping:
 * - Pending: Amber
 * - Shortlisted: Blue
 * - Accepted: Green
 * - Rejected: Red
 *
 * Student Display Rule:
 * When `displayForStudent={true}` is passed, any 'Rejected' status MUST render
 * as "Not Selected" instead of "Rejected" to maintain a constructive user experience.
 *
 * @param {Object} props
 * @param {'Pending' | 'Shortlisted' | 'Accepted' | 'Rejected' | string} props.status - Current application status.
 * @param {boolean} [props.displayForStudent=false] - Whether the badge is rendered in student-facing context.
 * @param {'sm' | 'md'} [props.size='md'] - Visual badge size variant.
 * @param {string} [props.className=''] - Additional custom CSS class names.
 * @returns {React.ReactElement}
 */

import React from 'react';
import { Clock, UserCheck, CheckCircle2, XCircle } from 'lucide-react';

export default function StatusBadge({
  status = 'Pending',
  displayForStudent = false,
  size = 'md',
  className = '',
}) {
  // Normalize status string (capitalized)
  const normalizedStatus = status
    ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    : 'Pending';

  // Config mapping for each status
  const statusConfigs = {
    Pending: {
      colorClasses:
        'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
      dotColor: 'bg-amber-500',
      icon: Clock,
      label: 'Pending',
    },
    Shortlisted: {
      colorClasses:
        'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
      dotColor: 'bg-blue-500',
      icon: UserCheck,
      label: 'Shortlisted',
    },
    Accepted: {
      colorClasses:
        'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
      dotColor: 'bg-emerald-500',
      icon: CheckCircle2,
      label: 'Accepted',
    },
    Rejected: {
      colorClasses:
        'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
      dotColor: 'bg-rose-500',
      icon: XCircle,
      label: displayForStudent ? 'Not Selected' : 'Rejected',
    },
  };

  const currentConfig = statusConfigs[normalizedStatus] || statusConfigs.Pending;
  const IconComponent = currentConfig.icon;

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs gap-1 font-medium'
      : 'px-2.5 py-1 text-xs sm:text-sm gap-1.5 font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-xs transition-colors ${currentConfig.colorClasses} ${sizeClasses} ${className}`}
    >
      <IconComponent className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{currentConfig.label}</span>
    </span>
  );
}
