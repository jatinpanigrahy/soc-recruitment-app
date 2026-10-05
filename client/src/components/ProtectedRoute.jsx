/**
 * Protected Route Component
 *
 * Route guard wrapper that inspects the authentication context.
 * - Displays an accessible loading spinner while session verification is ongoing.
 * - Redirects unauthenticated visitors to `/login`, preserving intended destination in router state.
 * - Restricts access by user role if `allowedRoles` array is specified, redirecting
 *   unauthorized accounts to a safe fallback route (`/`).
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Protected child components / views.
 * @param {string[]} [props.allowedRoles] - Optional whitelist of authorized user roles (e.g. ['student']).
 * @param {string} [props.fallbackPath='/'] - Fallback path for authorized users lacking specific role permissions.
 * @returns {React.ReactElement}
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles, fallbackPath = '/' }) {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" />
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Verifying authorization...
        </span>
      </div>
    );
  }

  // Redirect to login if session token or user is missing
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce role-based access if allowedRoles array is provided
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return children;
}
