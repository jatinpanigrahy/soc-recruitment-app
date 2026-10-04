/**
 * Profile Page
 *
 * Displays user identity (read-only username and email) and provides an editable
 * form for progressive profile details (full name, branch, academic year, avatar).
 * Integrates direct Cloudinary unsigned image upload with local fallback.
 * Persists updates via PATCH /auth/profile using axiosInstance.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { axiosInstance } from '../api/axiosInstance';
import {
  User,
  Mail,
  Camera,
  BookOpen,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, token, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // UI state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [imageNotice, setImageNotice] = useState('');

  // Redirect to login if unauthenticated
  useEffect(() => {
    if (!authLoading && !token) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, token, navigate]);

  // Fetch full user details on mount to ensure fresh state
  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!token) return;

      try {
        const res = await axiosInstance.get('/auth/me');
        if (isMounted && res.data?.user) {
          const u = res.data.user;
          setFullName(u.fullName || '');
          setBranch(u.branch || '');
          setYear(u.year || '');
          setAvatarUrl(u.avatarUrl || '');
          updateUser(u);
        }
      } catch (err) {
        console.warn('Could not refresh profile details:', err);
        // Fall back to existing cached user context
        if (user && isMounted) {
          setFullName(user.fullName || '');
          setBranch(user.branch || '');
          setYear(user.year || '');
          setAvatarUrl(user.avatarUrl || '');
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [token]);

  /**
   * Handle avatar file selection.
   * Attempts direct unsigned upload to Cloudinary; falls back to local object URL on error or missing config.
   */
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageNotice('');
    setError('');
    setIsUploadingImage(true);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    // If Cloudinary configuration exists, attempt unsigned REST upload
    if (cloudName && uploadPreset) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          setAvatarUrl(data.secure_url);
          setImageNotice('Avatar uploaded successfully!');
          return;
        } else {
          throw new Error(data.error?.message || 'Cloudinary upload failed');
        }
      } catch (err) {
        console.warn('Cloudinary upload error, using local fallback:', err);
        const fallbackUrl = URL.createObjectURL(file);
        setAvatarUrl(fallbackUrl);
        setImageNotice('Uploaded in offline mode (using local preview).');
      } finally {
        setIsUploadingImage(false);
      }
    } else {
      // Cloudinary credentials not configured: fallback to local preview URL directly
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);
      setImageNotice('Avatar updated locally.');
      setIsUploadingImage(false);
    }
  };

  /**
   * Save profile updates via PATCH /auth/profile
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaveSuccess(false);
    setIsSaving(true);

    try {
      const payload = {
        fullName: fullName.trim(),
        branch: branch.trim(),
        year: year.trim(),
        avatarUrl: avatarUrl.trim(),
      };

      const res = await axiosInstance.patch('/auth/profile', payload);
      if (res.data?.user) {
        updateUser(res.data.user);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save profile changes. Please try again.';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Banner / Header */}
        <div className="bg-slate-100 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 px-6 py-6 sm:px-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Your Profile
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal academic information and campus identity
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Profile details updated successfully!</span>
            </div>
          )}

          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800 border-2 border-violet-500 flex items-center justify-center text-slate-600 dark:text-slate-300 text-2xl font-bold shadow-sm">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={user?.username || 'Avatar'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>
                    {(user?.username || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {/* Upload trigger overlay button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-150 cursor-pointer"
                title="Change profile avatar"
              >
                {isUploadingImage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5" />
                    <span className="text-[10px] mt-0.5">Upload</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5 text-violet-500" />
                  <span>{isUploadingImage ? 'Uploading...' : 'Change Avatar'}</span>
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarUrl('');
                      setImageNotice('');
                    }}
                    className="px-3 py-1.5 text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">
                JPG, PNG or GIF up to 5MB. Unsigned Cloudinary upload with local fallback.
              </p>
              {imageNotice && (
                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                  {imageNotice}
                </p>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Read-Only Credentials Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Username (Read-Only)
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    disabled
                    value={user?.username || ''}
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed select-none text-sm"
                  />
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Email Address (Read-Only)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    readOnly
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-10 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed select-none text-sm"
                  />
                  <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Editable Profile Fields */}
            <div className="space-y-4 pt-2">
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="branch"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Academic Branch / Department
                  </label>
                  <div className="relative">
                    <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="branch"
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="e.g. Computer Science"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="year"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Current Year
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="year"
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="e.g. 2nd Year / Sophomore"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving || isUploadingImage}
                className="py-2.5 px-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium rounded-xl transition duration-150 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 cursor-pointer shadow-sm text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
