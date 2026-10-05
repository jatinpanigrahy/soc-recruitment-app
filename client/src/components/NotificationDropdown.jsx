/**
 * NotificationDropdown Component
 *
 * Renders an interactive bell icon with an unread badge and dropdown menu.
 * Features:
 * 1. Fetches notifications via GET /notifications.
 * 2. Real-time periodic polling (every 30 seconds) and on-open synchronization.
 * 3. Shows unread notification count badge over the bell icon.
 * 4. Allows marking individual notifications as read (PATCH /notifications/:id/read).
 * 5. Allows marking all notifications as read (PATCH /notifications/read-all).
 * 6. Supports outside-click dismiss and keyboard escape.
 * 7. Applies the Pulse design system (violet accents, solid/frosted surfaces).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { axiosInstance } from '../api/axiosInstance';
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Clock,
  Inbox,
  Sparkles,
  ShieldCheck,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react';

/**
 * Format relative or localized date/time
 * @param {string|Date} dateString
 * @returns {string}
 */
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Helper to select appropriate icon for notification type
 * @param {string} type
 */
function getNotificationIcon(type) {
  switch (type) {
    case 'status_changed':
      return <Sparkles className="w-4 h-4 text-violet-500" />;
    case 'admin_assigned':
      return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    case 'application_submitted':
      return <FileText className="w-4 h-4 text-blue-500" />;
    default:
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
  }
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const dropdownRef = useRef(null);

  /**
   * Fetch user notifications from API
   */
  const fetchNotifications = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await axiosInstance.get('/notifications');
      const items = res.data?.data || [];
      const unread = res.data?.unreadCount ?? items.filter((n) => !n.read).length;
      setNotifications(items);
      setUnreadCount(unread);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Initial fetch and 30s background polling
  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Toggle dropdown and re-sync notifications
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(false);
    }
  };

  /**
   * Mark a single notification as read
   * @param {string} id
   * @param {React.MouseEvent} [e]
   */
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev.map((item) => (item._id === id ? { ...item, read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await axiosInstance.patch(`/notifications/${id}/read`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Re-sync on error
      fetchNotifications(false);
    }
  };

  /**
   * Mark all unread notifications as read
   */
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      // Optimistic update
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);

      await axiosInstance.patch('/notifications/read-all');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      fetchNotifications(false);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
      >
        <Bell className="w-4 h-4 transition-transform group-hover:rotate-12" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-950 animate-in zoom-in-50 duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu Container */}
      {isOpen && (
        <div
          role="region"
          aria-label="Notifications list"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl shadow-violet-950/10 dark:shadow-black/50 z-50 overflow-hidden transform animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/40">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 disabled:opacity-50 transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                {markingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-violet-600 dark:text-violet-400" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/30 text-violet-500 flex items-center justify-center mb-3">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  No notifications yet
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                  You&apos;ll be notified of recruitment updates and application status changes here.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => !item.read && handleMarkAsRead(item._id)}
                  className={`p-3.5 transition-colors flex items-start gap-3 cursor-pointer group ${
                    item.read
                      ? 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
                      : 'bg-violet-50/50 dark:bg-violet-950/20 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                  }`}
                >
                  {/* Type Icon Badge */}
                  <div className="mt-0.5 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/50 dark:border-white/10 shadow-xs flex-shrink-0">
                    {getNotificationIcon(item.type)}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2 mb-0.5">
                      <p
                        className={`text-xs font-semibold truncate ${
                          item.read
                            ? 'text-slate-700 dark:text-slate-300'
                            : 'text-slate-900 dark:text-white font-bold'
                        }`}
                      >
                        {item.title || 'System Notification'}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 flex-shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {/* Individual Mark Read Button */}
                  {!item.read && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(item._id, e)}
                      title="Mark as read"
                      aria-label="Mark notification as read"
                      className="p-1 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-100/50 dark:hover:bg-white/10 transition-colors opacity-70 group-hover:opacity-100 flex-shrink-0"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
