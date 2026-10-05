/**
 * AdminDashboardPage Component
 *
 * Unified Administration Portal for Society Admins and Platform Super Admins.
 *
 * Features:
 * 1. Society Admin View:
 *    - Society switcher dropdown populated from user's managed societies (or all clubs for super admin).
 *    - Real-time local analytics calculated dynamically from fetched applicants (Total, Pending, Shortlisted, Accepted, Rejected, Acceptance Rate).
 *    - Search and filterable applicant pipeline table (GET /admin/applicants/:societyId).
 *    - Application detail inspector modal with question responses.
 *    - Application status update dialog with mandatory/optional feedback note (PATCH /admin/applicants/:societyId/:applicationId/status).
 *    - Recruitment cycle manager: toggle open/closed and edit deadline (PATCH /admin/societies/:societyId/recruitment).
 *    - Recruitment questions editor: general questions & role-specific questions (PATCH /admin/societies/:societyId/questions).
 *
 * 2. Super Admin View:
 *    - All society management capabilities above across ANY society.
 *    - Dedicated Super Admin governance tabs:
 *      a) Create Society: multipart form with Cloudinary logo upload (POST /super-admin/societies).
 *      b) Manage Users & Roles: list platform users (GET /super-admin/users) and promote with society keychain assignment (PATCH /super-admin/promote-user).
 *      c) Global Analytics: platform metrics (GET /super-admin/analytics).
 *      d) Society Archive & Directory: soft-delete archive toggle (PATCH /super-admin/societies/:id/archive).
 *
 * 3. Design & UX:
 *    - Full adherence to the Pulse design system (violet-500 accents, solid and glass surfaces).
 *    - Accessible modal dialogs, loading skeletons, transient toast alerts, and responsive layout.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { axiosInstance } from '../api/axiosInstance';
import Navbar from '../components/Navbar';
import StatusBadge from '../components/StatusBadge';
import ToastNotification from '../components/ToastNotification';
import { getCategoryColor } from '../utils/categoryColors';
import {
  Shield,
  ShieldCheck,
  Building2,
  Users,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Trash2,
  RefreshCw,
  Calendar,
  Lock,
  Unlock,
  BarChart3,
  Layers,
  UserPlus,
  Archive,
  Eye,
  Check,
  X,
  Loader2,
  FileText,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Upload,
  Briefcase,
  ChevronDown,
  Sparkles,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

const SOCIETY_CATEGORIES = [
  'Technical',
  'Cultural',
  'Literary',
  'Sports',
  'Music',
  'Dance',
  'Social',
  'Academic',
  'Media',
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Active top-level navigation mode (for super admin: 'society' | 'superadmin')
  const [activeMainTab, setActiveMainTab] = useState('society');

  // Society Management Sub-tab ('applicants' | 'recruitment' | 'questions')
  const [societySubTab, setSocietySubTab] = useState('applicants');

  // Super Admin Sub-tab ('analytics' | 'create_society' | 'manage_users' | 'directory')
  const [superAdminSubTab, setSuperAdminSubTab] = useState('analytics');

  // List of all societies and selected active society
  const [allSocieties, setAllSocieties] = useState([]);
  const [selectedSocietyId, setSelectedSocietyId] = useState('');
  const [activeSociety, setActiveSociety] = useState(null);
  const [societiesLoading, setSocietiesLoading] = useState(true);

  // Applicant pipeline state
  const [applicants, setApplicants] = useState([]);
  const [applicantsLoading, setApplicantsLoading] = useState(false);
  const [applicantSearch, setApplicantSearch] = useState('');
  const [applicantStatusFilter, setApplicantStatusFilter] = useState('All');
  const [applicantRoleFilter, setApplicantRoleFilter] = useState('All');

  // Application detail / review modal
  const [inspectingApp, setInspectingApp] = useState(null);
  const [updatingAppStatus, setUpdatingAppStatus] = useState(null);
  const [newStatus, setNewStatus] = useState('Pending');
  const [feedbackNote, setFeedbackNote] = useState('');
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Recruitment Cycle Settings state
  const [cycleDeadline, setCycleDeadline] = useState('');
  const [isTogglingCycle, setIsTogglingCycle] = useState(false);

  // Question Management state
  const [generalQuestions, setGeneralQuestions] = useState([]);
  const [newGeneralQuestion, setNewGeneralQuestion] = useState('');
  const [roleQuestionsMap, setRoleQuestionsMap] = useState({});
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);

  // Super Admin: Global Analytics state
  const [globalAnalytics, setGlobalAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Super Admin: User Directory state
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  // Super Admin: Promote User Modal
  const [promotingUser, setPromotingUser] = useState(null);
  const [targetRole, setTargetRole] = useState('society_admin');
  const [targetManagedSocieties, setTargetManagedSocieties] = useState([]);
  const [isSavingPromotion, setIsSavingPromotion] = useState(false);

  // Super Admin: Create Society Form state
  const [newSocName, setNewSocName] = useState('');
  const [newSocCategory, setNewSocCategory] = useState('Technical');
  const [newSocTagline, setNewSocTagline] = useState('');
  const [newSocDescription, setNewSocDescription] = useState('');
  const [newSocDeadline, setNewSocDeadline] = useState('');
  const [newSocAllowMultiple, setNewSocAllowMultiple] = useState(true);
  const [newSocLogoFile, setNewSocLogoFile] = useState(null);
  const [newSocLogoPreview, setNewSocLogoPreview] = useState('');
  const [newSocRoles, setNewSocRoles] = useState([
    { title: 'Core Member', description: 'Active contributor', requirements: 'Enthusiasm and passion' },
  ]);
  const [isCreatingSociety, setIsCreatingSociety] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState(null);

  /**
   * Helper to trigger a toast banner
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} [type='success']
   */
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  /**
   * Fetch all societies from API to populate switcher and selectors
   */
  const fetchSocieties = useCallback(async () => {
    setSocietiesLoading(true);
    try {
      const res = await axiosInstance.get('/societies');
      const list = res.data?.data || res.data?.societies || [];
      setAllSocieties(list);

      // Determine default active society
      if (list.length > 0) {
        if (isSuperAdmin) {
          // Default to first society in list
          setSelectedSocietyId((prev) => prev || list[0]._id);
        } else {
          // For society_admin, pick the first society matching their managed keychain
          const managedIds = (user?.managedSocieties || []).map((s) =>
            typeof s === 'object' && s !== null ? s._id : s
          );
          const firstManaged = list.find((s) => managedIds.includes(s._id));
          if (firstManaged) {
            setSelectedSocietyId((prev) => prev || firstManaged._id);
          } else if (managedIds.length > 0) {
            setSelectedSocietyId((prev) => prev || managedIds[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch societies:', err);
      showToast('Failed to load society directory', 'error');
    } finally {
      setSocietiesLoading(false);
    }
  }, [isSuperAdmin, user, showToast]);

  // Initial load of societies
  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  // Filter accessible societies for current user
  const accessibleSocieties = useMemo(() => {
    if (isSuperAdmin) return allSocieties;
    const managedIds = (user?.managedSocieties || []).map((s) =>
      typeof s === 'object' && s !== null ? s._id : s
    );
    return allSocieties.filter((s) => managedIds.includes(s._id));
  }, [allSocieties, isSuperAdmin, user]);

  // Synchronize active society object when selectedSocietyId changes
  useEffect(() => {
    if (!selectedSocietyId) return;
    const target = allSocieties.find((s) => s._id === selectedSocietyId);
    if (target) {
      setActiveSociety(target);
      // Sync questions state
      setGeneralQuestions(target.generalQuestions || []);
      // Sync role questions map
      const map = {};
      (target.openRoles || []).forEach((r) => {
        map[r._id || r.title] = r.questions || [];
      });
      setRoleQuestionsMap(map);
      // Sync deadline input
      if (target.deadline) {
        try {
          const dateObj = new Date(target.deadline);
          const formatted = dateObj.toISOString().slice(0, 16);
          setCycleDeadline(formatted);
        } catch {
          setCycleDeadline('');
        }
      }
    }
  }, [selectedSocietyId, allSocieties]);

  /**
   * Fetch applicants for the currently selected society
   */
  const fetchApplicants = useCallback(async () => {
    if (!selectedSocietyId) return;
    setApplicantsLoading(true);
    try {
      // Primary route: GET /api/admin/applicants/:societyId
      const res = await axiosInstance.get(`/admin/applicants/${selectedSocietyId}`);
      setApplicants(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load applicants:', err);
      // Fallback route attempt: GET /api/admin/societies/:societyId/applicants
      try {
        const fallbackRes = await axiosInstance.get(
          `/admin/societies/${selectedSocietyId}/applicants`
        );
        setApplicants(fallbackRes.data?.data || []);
      } catch (fallbackErr) {
        console.error('Fallback applicants retrieval failed:', fallbackErr);
        showToast('Unable to fetch applicants for this society', 'error');
      }
    } finally {
      setApplicantsLoading(false);
    }
  }, [selectedSocietyId, showToast]);

  // Re-fetch applicants when selected society changes
  useEffect(() => {
    if (selectedSocietyId) {
      fetchApplicants();
    }
  }, [selectedSocietyId, fetchApplicants]);

  // Compute dynamic local analytics from fetched applicants
  const localAnalytics = useMemo(() => {
    const total = applicants.length;
    let pending = 0;
    let shortlisted = 0;
    let accepted = 0;
    let rejected = 0;

    applicants.forEach((a) => {
      const st = a.status ? a.status.toLowerCase() : 'pending';
      if (st === 'pending') pending++;
      else if (st === 'shortlisted') shortlisted++;
      else if (st === 'accepted') accepted++;
      else if (st === 'rejected') rejected++;
    });

    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return {
      total,
      pending,
      shortlisted,
      accepted,
      rejected,
      acceptanceRate,
    };
  }, [applicants]);

  // Distinct roles available in applicant list for filtering
  const distinctRoles = useMemo(() => {
    const set = new Set();
    applicants.forEach((a) => {
      if (a.roleAppliedFor) set.add(a.roleAppliedFor);
    });
    return Array.from(set);
  }, [applicants]);

  // Filtered applicants based on search string and filters
  const filteredApplicants = useMemo(() => {
    return applicants.filter((app) => {
      // Status filter
      if (applicantStatusFilter !== 'All' && app.status !== applicantStatusFilter) {
        return false;
      }
      // Role filter
      if (applicantRoleFilter !== 'All' && app.roleAppliedFor !== applicantRoleFilter) {
        return false;
      }
      // Search filter
      if (applicantSearch.trim()) {
        const query = applicantSearch.toLowerCase();
        const student = app.student || {};
        const matchesName = student.fullName?.toLowerCase().includes(query);
        const matchesUsername = student.username?.toLowerCase().includes(query);
        const matchesEmail = student.email?.toLowerCase().includes(query);
        const matchesBranch = student.branch?.toLowerCase().includes(query);
        const matchesRole = app.roleAppliedFor?.toLowerCase().includes(query);

        if (!matchesName && !matchesUsername && !matchesEmail && !matchesBranch && !matchesRole) {
          return false;
        }
      }
      return true;
    });
  }, [applicants, applicantStatusFilter, applicantRoleFilter, applicantSearch]);

  /**
   * Handle application status update and dispatch notification
   */
  const handleUpdateStatus = async () => {
    if (!updatingAppStatus || !selectedSocietyId) return;
    setIsSavingStatus(true);
    try {
      const res = await axiosInstance.patch(
        `/admin/applicants/${selectedSocietyId}/${updatingAppStatus._id}/status`,
        {
          status: newStatus,
          feedbackNote: feedbackNote.trim() || undefined,
        }
      );

      const updatedDoc = res.data?.data;

      // Update state locally
      setApplicants((prev) =>
        prev.map((item) =>
          item._id === updatingAppStatus._id
            ? {
                ...item,
                status: updatedDoc?.status || newStatus,
                feedbackNote: updatedDoc?.feedbackNote || feedbackNote,
              }
            : item
        )
      );

      if (inspectingApp?._id === updatingAppStatus._id) {
        setInspectingApp((prev) => ({
          ...prev,
          status: updatedDoc?.status || newStatus,
          feedbackNote: updatedDoc?.feedbackNote || feedbackNote,
        }));
      }

      showToast(`Application updated to ${newStatus}`, 'success');
      setUpdatingAppStatus(null);
      setFeedbackNote('');
    } catch (err) {
      console.error('Failed to update status:', err);
      showToast(err.response?.data?.message || 'Failed to update application status', 'error');
    } finally {
      setIsSavingStatus(false);
    }
  };

  /**
   * Toggle recruitment cycle or update deadline
   * @param {boolean} [shouldOpen]
   */
  const handleToggleRecruitment = async (shouldOpen) => {
    if (!selectedSocietyId) return;
    setIsTogglingCycle(true);
    try {
      const payload = {};
      if (shouldOpen !== undefined) {
        payload.isOpen = shouldOpen;
        if (shouldOpen && cycleDeadline) {
          payload.deadline = new Date(cycleDeadline).toISOString();
        }
      } else if (cycleDeadline) {
        payload.deadline = new Date(cycleDeadline).toISOString();
      }

      const res = await axiosInstance.patch(
        `/admin/societies/${selectedSocietyId}/recruitment`,
        payload
      );

      const updatedSociety = res.data?.data;
      if (updatedSociety) {
        setActiveSociety(updatedSociety);
        setAllSocieties((prev) =>
          prev.map((s) => (s._id === updatedSociety._id ? updatedSociety : s))
        );
      }
      showToast(res.data?.message || 'Recruitment cycle updated', 'success');
    } catch (err) {
      console.error('Failed to toggle recruitment cycle:', err);
      showToast(err.response?.data?.message || 'Error updating recruitment cycle', 'error');
    } finally {
      setIsTogglingCycle(false);
    }
  };

  /**
   * Save general and role-specific recruitment questions
   */
  const handleSaveQuestions = async () => {
    if (!selectedSocietyId) return;
    setIsSavingQuestions(true);
    try {
      // Build roleQuestions structure
      const roleQuestions = Object.entries(roleQuestionsMap).map(([roleKey, questions]) => ({
        roleId: roleKey,
        roleTitle: roleKey,
        questions,
      }));

      const res = await axiosInstance.patch(
        `/admin/societies/${selectedSocietyId}/questions`,
        {
          generalQuestions,
          roleQuestions,
        }
      );

      const updatedSociety = res.data?.data;
      if (updatedSociety) {
        setActiveSociety(updatedSociety);
        setAllSocieties((prev) =>
          prev.map((s) => (s._id === updatedSociety._id ? updatedSociety : s))
        );
      }
      showToast('Recruitment questions updated successfully', 'success');
    } catch (err) {
      console.error('Failed to update questions:', err);
      showToast(err.response?.data?.message || 'Error updating questions', 'error');
    } finally {
      setIsSavingQuestions(false);
    }
  };

  // Add question to general pool
  const handleAddGeneralQuestion = () => {
    if (!newGeneralQuestion.trim()) return;
    setGeneralQuestions((prev) => [...prev, newGeneralQuestion.trim()]);
    setNewGeneralQuestion('');
  };

  // Remove question from general pool
  const handleRemoveGeneralQuestion = (index) => {
    setGeneralQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  // Add question to role-specific pool
  const handleAddRoleQuestion = (roleKey, questionText) => {
    if (!questionText.trim()) return;
    setRoleQuestionsMap((prev) => ({
      ...prev,
      [roleKey]: [...(prev[roleKey] || []), questionText.trim()],
    }));
  };

  // Remove question from role-specific pool
  const handleRemoveRoleQuestion = (roleKey, index) => {
    setRoleQuestionsMap((prev) => ({
      ...prev,
      [roleKey]: (prev[roleKey] || []).filter((_, i) => i !== index),
    }));
  };

  // --- Super Admin Actions ---

  /**
   * Fetch global platform analytics
   */
  const fetchGlobalAnalytics = useCallback(async () => {
    if (!isSuperAdmin) return;
    setAnalyticsLoading(true);
    try {
      const res = await axiosInstance.get('/super-admin/analytics');
      setGlobalAnalytics(res.data?.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      showToast('Failed to load platform analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [isSuperAdmin, showToast]);

  /**
   * Fetch platform user directory
   */
  const fetchUsers = useCallback(async () => {
    if (!isSuperAdmin) return;
    setUsersLoading(true);
    try {
      const res = await axiosInstance.get('/super-admin/users');
      setUsersList(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showToast('Failed to load user directory', 'error');
    } finally {
      setUsersLoading(false);
    }
  }, [isSuperAdmin, showToast]);

  // Load super admin analytics or users when tab selected
  useEffect(() => {
    if (isSuperAdmin && activeMainTab === 'superadmin') {
      if (superAdminSubTab === 'analytics') {
        fetchGlobalAnalytics();
      } else if (superAdminSubTab === 'manage_users') {
        fetchUsers();
      }
    }
  }, [isSuperAdmin, activeMainTab, superAdminSubTab, fetchGlobalAnalytics, fetchUsers]);

  /**
   * Promote user and assign managed societies
   */
  const handlePromoteUser = async () => {
    if (!promotingUser) return;
    setIsSavingPromotion(true);
    try {
      const payload = {
        userId: promotingUser._id,
        role: targetRole,
        managedSocieties: targetRole === 'society_admin' ? targetManagedSocieties : [],
      };

      const res = await axiosInstance.patch(
        `/super-admin/users/${promotingUser._id}/promote`,
        payload
      );

      const updatedUser = res.data?.data;
      setUsersList((prev) =>
        prev.map((u) => (u._id === promotingUser._id ? { ...u, ...updatedUser } : u))
      );

      showToast(`User ${promotingUser.username} updated to ${targetRole}`, 'success');
      setPromotingUser(null);
    } catch (err) {
      console.error('Failed to promote user:', err);
      showToast(err.response?.data?.message || 'Failed to update user role', 'error');
    } finally {
      setIsSavingPromotion(false);
    }
  };

  /**
   * Create new society with multipart/form-data
   */
  const handleCreateSociety = async (e) => {
    e.preventDefault();
    if (!newSocName.trim() || !newSocTagline.trim() || !newSocDescription.trim()) {
      showToast('Please fill out all required fields', 'warning');
      return;
    }

    setIsCreatingSociety(true);
    try {
      const formData = new FormData();
      formData.append('name', newSocName.trim());
      formData.append('category', newSocCategory);
      formData.append('tagline', newSocTagline.trim());
      formData.append('description', newSocDescription.trim());
      formData.append('allowMultipleRoles', String(newSocAllowMultiple));

      if (newSocDeadline) {
        formData.append('deadline', new Date(newSocDeadline).toISOString());
      }

      if (newSocLogoFile) {
        formData.append('logo', newSocLogoFile);
      }

      if (newSocRoles.length > 0) {
        formData.append('openRoles', JSON.stringify(newSocRoles));
      }

      const res = await axiosInstance.post('/super-admin/societies', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      showToast('Society successfully created!', 'success');
      // Reset form
      setNewSocName('');
      setNewSocTagline('');
      setNewSocDescription('');
      setNewSocDeadline('');
      setNewSocLogoFile(null);
      setNewSocLogoPreview('');
      setNewSocRoles([
        { title: 'Core Member', description: 'Active contributor', requirements: 'Enthusiasm and passion' },
      ]);

      // Re-fetch societies
      await fetchSocieties();
      // Switch back to society management view for the newly created club
      const created = res.data?.data;
      if (created?._id) {
        setSelectedSocietyId(created._id);
        setActiveMainTab('society');
      }
    } catch (err) {
      console.error('Failed to create society:', err);
      showToast(err.response?.data?.message || 'Error creating society', 'error');
    } finally {
      setIsCreatingSociety(false);
    }
  };

  /**
   * Toggle archive state for society
   * @param {string} societyId
   * @param {boolean} currentArchived
   */
  const handleToggleArchive = async (societyId, currentArchived) => {
    try {
      const res = await axiosInstance.patch(`/super-admin/societies/${societyId}/archive`, {
        isArchived: !currentArchived,
      });
      const updated = res.data?.data;
      setAllSocieties((prev) =>
        prev.map((s) => (s._id === societyId ? { ...s, isArchived: updated?.isArchived } : s))
      );
      showToast(
        `Society ${!currentArchived ? 'archived' : 'restored'} successfully`,
        'success'
      );
    } catch (err) {
      console.error('Failed to toggle archive:', err);
      showToast('Failed to update society status', 'error');
    }
  };

  // Check if active society recruitment is currently open
  const isRecruitmentOpen = useMemo(() => {
    if (!activeSociety?.deadline) return false;
    return new Date(activeSociety.deadline).getTime() > Date.now();
  }, [activeSociety]);

  // Filtered users for Manage Users view
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (userRoleFilter !== 'All' && u.role !== userRoleFilter) return false;
      if (userSearch.trim()) {
        const query = userSearch.toLowerCase();
        const matchesName = u.fullName?.toLowerCase().includes(query);
        const matchesUsername = u.username?.toLowerCase().includes(query);
        const matchesEmail = u.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesUsername && !matchesEmail) return false;
      }
      return true;
    });
  }, [usersList, userRoleFilter, userSearch]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <Navbar />

      {/* Global Toast Feedback */}
      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">
                  Admin Command Center
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Oversee recruitment pipelines, manage cycles, and configure questionnaires.
                </p>
              </div>
            </div>
          </div>

          {/* Role Pill & Super Admin Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                isSuperAdmin
                  ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
                  : 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isSuperAdmin ? 'Super Admin' : 'Society Admin'}</span>
            </span>

            {/* If Super Admin, show toggle between Club Management and Super Admin Governance */}
            {isSuperAdmin && (
              <div className="inline-flex rounded-xl p-1 bg-slate-200/70 dark:bg-white/10">
                <button
                  type="button"
                  onClick={() => setActiveMainTab('society')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeMainTab === 'society'
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Club Pipeline
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMainTab('superadmin')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeMainTab === 'superadmin'
                      ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Super Admin Panel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW A: SOCIETY ADMIN & CLUB PIPELINE MANAGEMENT         */}
        {/* ======================================================== */}
        {activeMainTab === 'society' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Society Selector Bar */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {activeSociety?.logoUrl ? (
                    <img
                      src={activeSociety.logoUrl}
                      alt={activeSociety.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="society-select"
                      className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Active Club
                    </label>
                    {activeSociety && (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                          getCategoryColor(activeSociety.category).bg
                        } ${getCategoryColor(activeSociety.category).text}`}
                      >
                        {activeSociety.category}
                      </span>
                    )}
                  </div>

                  {/* Society Switcher Dropdown */}
                  <div className="relative mt-1">
                    <select
                      id="society-select"
                      value={selectedSocietyId}
                      onChange={(e) => setSelectedSocietyId(e.target.value)}
                      disabled={accessibleSocieties.length <= 1}
                      className="text-base sm:text-lg font-bold bg-transparent text-slate-900 dark:text-white border-b border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 focus:outline-none focus:border-violet-600 cursor-pointer pr-6"
                    >
                      {accessibleSocieties.map((soc) => (
                        <option
                          key={soc._id}
                          value={soc._id}
                          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        >
                          {soc.name} {soc.isArchived ? '(Archived)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Recruitment Status Pill & Refresh Button */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    isRecruitmentOpen
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRecruitmentOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
                    }`}
                  />
                  <span>Recruitment: {isRecruitmentOpen ? 'OPEN' : 'CLOSED'}</span>
                </div>

                <button
                  type="button"
                  onClick={fetchApplicants}
                  disabled={applicantsLoading}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  title="Refresh applicants list"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${applicantsLoading ? 'animate-spin text-violet-600' : ''}`}
                  />
                </button>
              </div>
            </div>

            {/* Local Analytics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {/* Total Applicants */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                  <span className="text-xs font-medium">Total Applied</span>
                  <Users className="w-4 h-4 text-violet-500" />
                </div>
                <div className="text-2xl font-extrabold">{localAnalytics.total}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Candidates</div>
              </div>

              {/* Pending */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex items-center justify-between text-amber-500 mb-2">
                  <span className="text-xs font-medium">Pending</span>
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {localAnalytics.pending}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Awaiting Review</div>
              </div>

              {/* Shortlisted */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex items-center justify-between text-blue-500 mb-2">
                  <span className="text-xs font-medium">Shortlisted</span>
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {localAnalytics.shortlisted}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Next Stage</div>
              </div>

              {/* Accepted */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex items-center justify-between text-emerald-500 mb-2">
                  <span className="text-xs font-medium">Accepted</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {localAnalytics.accepted}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Confirmed</div>
              </div>

              {/* Rejected */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex items-center justify-between text-rose-500 mb-2">
                  <span className="text-xs font-medium">Rejected</span>
                  <XCircle className="w-4 h-4" />
                </div>
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                  {localAnalytics.rejected}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Not Selected</div>
              </div>

              {/* Acceptance Rate */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                <div className="flex items-center justify-between text-violet-500 mb-2">
                  <span className="text-xs font-medium">Acceptance</span>
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div className="text-2xl font-extrabold text-violet-600 dark:text-violet-400">
                  {localAnalytics.acceptanceRate}%
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Rate</div>
              </div>
            </div>

            {/* Society Sub-navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pt-2">
              <button
                type="button"
                onClick={() => setSocietySubTab('applicants')}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  societySubTab === 'applicants'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Applicants Pipeline ({applicants.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSocietySubTab('recruitment')}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  societySubTab === 'recruitment'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Recruitment Cycle</span>
              </button>

              <button
                type="button"
                onClick={() => setSocietySubTab('questions')}
                className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                  societySubTab === 'questions'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                <span>Recruitment Questions</span>
              </button>
            </div>

            {/* Sub-tab 1: APPLICANTS PIPELINE TABLE */}
            {societySubTab === 'applicants' && (
              <div className="space-y-4">
                {/* Search & Filter Tray */}
                <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search candidate by name, username, branch, or email..."
                      value={applicantSearch}
                      onChange={(e) => setApplicantSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Filter */}
                    <div className="flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-slate-400" />
                      <select
                        value={applicantStatusFilter}
                        onChange={(e) => setApplicantStatusFilter(e.target.value)}
                        className="text-xs font-semibold px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Accepted">Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    {/* Role Filter */}
                    <select
                      value={applicantRoleFilter}
                      onChange={(e) => setApplicantRoleFilter(e.target.value)}
                      className="text-xs font-semibold px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    >
                      <option value="All">All Roles</option>
                      {distinctRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Table Container */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                  {applicantsLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
                      <p className="text-xs text-slate-500">Loading applicants...</p>
                    </div>
                  ) : filteredApplicants.length === 0 ? (
                    <div className="py-16 px-4 text-center">
                      <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        No applicants found
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        {applicants.length === 0
                          ? 'This club does not currently have any applications submitted.'
                          : 'No candidates matched your search criteria or active filter.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3.5">Candidate</th>
                            <th className="px-4 py-3.5">Role Applied</th>
                            <th className="px-4 py-3.5">Branch / Year</th>
                            <th className="px-4 py-3.5">Applied Date</th>
                            <th className="px-4 py-3.5">Status</th>
                            <th className="px-4 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {filteredApplicants.map((app) => {
                            const student = app.student || {};
                            return (
                              <tr
                                key={app._id}
                                className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors"
                              >
                                {/* Candidate Info */}
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-violet-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                                      {student.fullName
                                        ? student.fullName.slice(0, 2).toUpperCase()
                                        : student.username
                                        ? student.username.slice(0, 2).toUpperCase()
                                        : 'ST'}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-900 dark:text-white">
                                        {student.fullName || student.username || 'Candidate'}
                                      </div>
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500">
                                        {student.email || student.username}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* Role */}
                                <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                                  <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-xs font-semibold">
                                    {app.roleAppliedFor}
                                  </span>
                                </td>

                                {/* Branch / Year */}
                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300 text-xs">
                                  {student.branch || student.year
                                    ? `${student.branch || '—'}, ${student.year || '—'}`
                                    : 'Not specified'}
                                </td>

                                {/* Applied Date */}
                                <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 text-xs">
                                  {app.createdAt
                                    ? new Date(app.createdAt).toLocaleDateString()
                                    : 'Recent'}
                                </td>

                                {/* Status */}
                                <td className="px-4 py-3.5 whitespace-nowrap">
                                  <StatusBadge status={app.status} size="sm" />
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* View Application Details */}
                                    <button
                                      type="button"
                                      onClick={() => setInspectingApp(app)}
                                      className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                      title="Review Application Answers"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {/* Change Status Button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUpdatingAppStatus(app);
                                        setNewStatus(app.status || 'Pending');
                                        setFeedbackNote(app.feedbackNote || '');
                                      }}
                                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800/40 transition-colors"
                                    >
                                      Update
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sub-tab 2: RECRUITMENT CYCLE MANAGER */}
            {societySubTab === 'recruitment' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-violet-500" />
                    Recruitment Cycle Governance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Control when prospective members can submit or edit applications for{' '}
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {activeSociety?.name}
                    </span>
                    .
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Current State</div>
                    <div className="text-xl font-bold flex items-center gap-2 mt-1">
                      {isRecruitmentOpen ? (
                        <>
                          <Unlock className="w-5 h-5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Recruitment Open</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5 text-rose-500" />
                          <span className="text-rose-600 dark:text-rose-400">Recruitment Closed</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {isRecruitmentOpen
                        ? `Deadline: ${
                            activeSociety?.deadline
                              ? new Date(activeSociety.deadline).toLocaleString()
                              : 'Ongoing'
                          }`
                        : 'Candidates cannot submit new applications while recruitment is closed.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isRecruitmentOpen ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRecruitment(false)}
                        disabled={isTogglingCycle}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all flex items-center gap-1.5"
                      >
                        {isTogglingCycle ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Lock className="w-3.5 h-3.5" />
                        )}
                        <span>Close Recruitment Now</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleRecruitment(true)}
                        disabled={isTogglingCycle}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all flex items-center gap-1.5"
                      >
                        {isTogglingCycle ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                        <span>Open Recruitment</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Deadline Setting */}
                <div className="space-y-3 max-w-lg">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Application Deadline Date & Time
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="datetime-local"
                      value={cycleDeadline}
                      onChange={(e) => setCycleDeadline(e.target.value)}
                      className="px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleToggleRecruitment(true)}
                      disabled={isTogglingCycle || !cycleDeadline}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-sm disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {isTogglingCycle ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Save & Set Deadline</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Students will see this deadline countdown on the Club Details and Application pages.
                  </p>
                </div>
              </div>
            )}

            {/* Sub-tab 3: RECRUITMENT QUESTIONS EDITOR */}
            {societySubTab === 'questions' && (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-violet-500" />
                      Configure Recruitment Questions
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Customize questions that students answer when applying to {activeSociety?.name}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveQuestions}
                    disabled={isSavingQuestions}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5 self-start"
                  >
                    {isSavingQuestions ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Save All Questions</span>
                  </button>
                </div>

                {/* General Questions Section */}
                <div className="space-y-4">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>General Questions</span>
                      <span className="text-xs font-normal text-slate-400">
                        (Presented to all candidates regardless of role)
                      </span>
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {generalQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs sm:text-sm"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">{q}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveGeneralQuestion(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {generalQuestions.length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2">
                        No general questions defined yet.
                      </p>
                    )}
                  </div>

                  {/* Add General Question Input */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Add a new general question (e.g. Why do you want to join our team?)..."
                      value={newGeneralQuestion}
                      onChange={(e) => setNewGeneralQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddGeneralQuestion()}
                      className="flex-1 px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddGeneralQuestion}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Role Specific Questions Section */}
                <div className="space-y-6 pt-4">
                  <div className="border-b border-slate-100 dark:border-white/10 pb-2">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span>Role-Specific Questions</span>
                      <span className="text-xs font-normal text-slate-400">
                        (Presented only when a candidate selects that specific role)
                      </span>
                    </h4>
                  </div>

                  <div className="space-y-6">
                    {(activeSociety?.openRoles || []).map((role) => {
                      const roleKey = role._id || role.title;
                      const roleQuestions = roleQuestionsMap[roleKey] || [];
                      return (
                        <div
                          key={roleKey}
                          className="p-4 rounded-xl bg-slate-50/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-violet-500" />
                              {role.title}
                            </span>
                            <span className="text-xs text-slate-400">
                              {roleQuestions.length} question(s)
                            </span>
                          </div>

                          <div className="space-y-2">
                            {roleQuestions.map((q, qIdx) => (
                              <div
                                key={qIdx}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/10 text-xs"
                              >
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {q}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRoleQuestion(roleKey, qIdx)}
                                  className="text-slate-400 hover:text-rose-500 p-1"
                                  title="Delete question"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            {roleQuestions.length === 0 && (
                              <p className="text-xs text-slate-400 italic">
                                No role-specific questions for this role yet.
                              </p>
                            )}
                          </div>

                          {/* Inline input to add role question */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="text"
                              id={`input-${roleKey}`}
                              placeholder={`Add question specific to ${role.title}...`}
                              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-violet-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddRoleQuestion(roleKey, e.target.value);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById(`input-${roleKey}`);
                                if (el && el.value) {
                                  handleAddRoleQuestion(roleKey, el.value);
                                  el.value = '';
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {(activeSociety?.openRoles || []).length === 0 && (
                      <p className="text-xs text-slate-400 italic">
                        This club currently has no open roles configured.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW B: SUPER ADMIN GOVERNANCE PANEL                     */}
        {/* ======================================================== */}
        {activeMainTab === 'superadmin' && isSuperAdmin && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Super Admin Tab Pill Bar */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-200/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSuperAdminSubTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  superAdminSubTab === 'analytics'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Global Analytics</span>
              </button>

              <button
                type="button"
                onClick={() => setSuperAdminSubTab('create_society')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  superAdminSubTab === 'create_society'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>Create Society</span>
              </button>

              <button
                type="button"
                onClick={() => setSuperAdminSubTab('manage_users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  superAdminSubTab === 'manage_users'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>User Directory & Roles</span>
              </button>

              <button
                type="button"
                onClick={() => setSuperAdminSubTab('directory')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  superAdminSubTab === 'directory'
                    ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Society Directory & Archive</span>
              </button>
            </div>

            {/* TAB B.1: GLOBAL ANALYTICS */}
            {superAdminSubTab === 'analytics' && (
              <div className="space-y-6">
                {analyticsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
                    <p className="text-xs text-slate-500">Aggregating platform metrics...</p>
                  </div>
                ) : globalAnalytics ? (
                  <>
                    {/* Platform KPI Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="text-xs font-semibold uppercase text-slate-400">
                          Total Applications
                        </div>
                        <div className="text-3xl font-extrabold text-violet-600 dark:text-violet-400 mt-1">
                          {globalAnalytics.totalApplications ?? globalAnalytics.totalApplicants ?? 0}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Across all societies</div>
                      </div>

                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="text-xs font-semibold uppercase text-slate-400">
                          Registered Users
                        </div>
                        <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                          {globalAnalytics.totalUsers ?? 0}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Active accounts</div>
                      </div>

                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="text-xs font-semibold uppercase text-slate-400">
                          Total Clubs
                        </div>
                        <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                          {globalAnalytics.totalSocieties ?? 0}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Catalog societies</div>
                      </div>

                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <div className="text-xs font-semibold uppercase text-slate-400">
                          Accepted Candidates
                        </div>
                        <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                          {globalAnalytics.statusBreakdown?.Accepted ?? 0}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Recruitment conversions</div>
                      </div>
                    </div>

                    {/* Breakdown per Society */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Layers className="w-5 h-5 text-violet-500" />
                        Application Volume by Society
                      </h3>

                      <div className="space-y-3 pt-2">
                        {(globalAnalytics.perSocietyCounts || []).map((item, idx) => {
                          const total =
                            globalAnalytics.totalApplications ||
                            globalAnalytics.totalApplicants ||
                            1;
                          const pct = Math.round((item.count / total) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <span className="text-slate-800 dark:text-slate-200">
                                  {item.societyName}
                                </span>
                                <span className="text-slate-500">
                                  {item.count} applications ({pct}%)
                                </span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-violet-600 dark:bg-violet-500 transition-all duration-500"
                                  style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}

                        {(globalAnalytics.perSocietyCounts || []).length === 0 && (
                          <p className="text-xs text-slate-400 italic">No applications logged yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Global Status Distribution */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                        Platform Application Pipeline Breakdown
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                            {globalAnalytics.statusBreakdown?.Pending ?? 0}
                          </div>
                          <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mt-1">
                            Pending
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                            {globalAnalytics.statusBreakdown?.Shortlisted ?? 0}
                          </div>
                          <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mt-1">
                            Shortlisted
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {globalAnalytics.statusBreakdown?.Accepted ?? 0}
                          </div>
                          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mt-1">
                            Accepted
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
                            {globalAnalytics.statusBreakdown?.Rejected ?? 0}
                          </div>
                          <div className="text-xs font-semibold text-rose-700 dark:text-rose-300 mt-1">
                            Rejected
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Failed to fetch analytics.
                  </div>
                )}
              </div>
            )}

            {/* TAB B.2: CREATE SOCIETY FORM */}
            {superAdminSubTab === 'create_society' && (
              <form
                onSubmit={handleCreateSociety}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6 max-w-3xl"
              >
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-violet-500" />
                    Register New Society
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Establish an official club on the Pulse discovery platform with Cloudinary logo upload.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Society Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Design Studio"
                      value={newSocName}
                      onChange={(e) => setNewSocName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  {/* Category */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Category *
                    </label>
                    <select
                      value={newSocCategory}
                      onChange={(e) => setNewSocCategory(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    >
                      {SOCIETY_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Tagline */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tagline / One-Liner *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Elevating product and visual experiences on campus"
                    value={newSocTagline}
                    onChange={(e) => setNewSocTagline(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detailed introduction of the society's mission and regular activities..."
                    value={newSocDescription}
                    onChange={(e) => setNewSocDescription(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  />
                </div>

                {/* Logo File Upload */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Society Logo (Cloudinary Upload)
                  </label>
                  <div className="flex items-center gap-4">
                    {newSocLogoPreview && (
                      <img
                        src={newSocLogoPreview}
                        alt="Logo preview"
                        className="w-12 h-12 rounded-xl object-cover border border-violet-300"
                      />
                    )}
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                      <Upload className="w-4 h-4 text-violet-500" />
                      <span>{newSocLogoFile ? newSocLogoFile.name : 'Choose Logo Image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewSocLogoFile(file);
                            setNewSocLogoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Initial Recruitment Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Recruitment Deadline
                    </label>
                    <input
                      type="datetime-local"
                      value={newSocDeadline}
                      onChange={(e) => setNewSocDeadline(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="allowMultiple"
                      checked={newSocAllowMultiple}
                      onChange={(e) => setNewSocAllowMultiple(e.target.checked)}
                      className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500"
                    />
                    <label
                      htmlFor="allowMultiple"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                    >
                      Allow candidates to apply for multiple roles
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-end">
                  <button
                    type="submit"
                    disabled={isCreatingSociety}
                    className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/30 disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    {isCreatingSociety ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Create Society</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB B.3: MANAGE USERS & ROLES */}
            {superAdminSubTab === 'manage_users' && (
              <div className="space-y-4">
                {/* Search & Filter */}
                <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search users by name, username, or email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                      className="text-xs font-semibold px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
                    >
                      <option value="All">All Roles</option>
                      <option value="student">Student</option>
                      <option value="society_admin">Society Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                </div>

                {/* Users Table */}
                <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xs">
                  {usersLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
                      <p className="text-xs text-slate-500">Loading user accounts...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      No users match the search criteria.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead className="bg-slate-50/80 dark:bg-white/5 border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3.5">User</th>
                            <th className="px-4 py-3.5">Email</th>
                            <th className="px-4 py-3.5">Current Role</th>
                            <th className="px-4 py-3.5">Managed Clubs</th>
                            <th className="px-4 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                          {filteredUsers.map((u) => (
                            <tr
                              key={u._id}
                              className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors"
                            >
                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {u.fullName || u.username}
                                </div>
                                <div className="text-[11px] text-slate-400">@{u.username}</div>
                              </td>

                              <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300 text-xs">
                                {u.email}
                              </td>

                              <td className="px-4 py-3.5 whitespace-nowrap">
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                    u.role === 'super_admin'
                                      ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300'
                                      : u.role === 'society_admin'
                                      ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                                  }`}
                                >
                                  {u.role}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-xs text-slate-500">
                                {u.managedSocieties && u.managedSocieties.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {u.managedSocieties.map((ms) => (
                                      <span
                                        key={ms._id || ms}
                                        className="px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-semibold"
                                      >
                                        {ms.name || 'Club'}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-xs">—</span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 whitespace-nowrap text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPromotingUser(u);
                                    setTargetRole(u.role || 'society_admin');
                                    const currentManaged = (u.managedSocieties || []).map((s) =>
                                      typeof s === 'object' && s !== null ? s._id : s
                                    );
                                    setTargetManagedSocieties(currentManaged);
                                  }}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800/40 transition-colors"
                                >
                                  Manage Role
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB B.4: SOCIETY DIRECTORY & ARCHIVE */}
            {superAdminSubTab === 'directory' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allSocieties.map((soc) => (
                  <div
                    key={soc._id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                            getCategoryColor(soc.category).bg
                          } ${getCategoryColor(soc.category).text}`}
                        >
                          {soc.category}
                        </span>

                        {soc.isArchived && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            ARCHIVED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {soc.logoUrl ? (
                            <img
                              src={soc.logoUrl}
                              alt={soc.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-violet-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {soc.name}
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1">{soc.tagline}</p>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                        {soc.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSocietyId(soc._id);
                          setActiveMainTab('society');
                        }}
                        className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                      >
                        <span>View Pipeline</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleArchive(soc._id, soc.isArchived)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          soc.isArchived
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        {soc.isArchived ? 'Restore' : 'Archive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: APPLICATION INSPECTOR / DETAILS VIEWER          */}
      {/* ======================================================== */}
      {inspectingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/5">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Application Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Candidate: {inspectingApp.student?.fullName || inspectingApp.student?.username} (
                  {inspectingApp.roleAppliedFor})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectingApp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Answers Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm">
              {/* Candidate Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                <div>
                  <span className="text-[11px] text-slate-400 block">Candidate Email</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectingApp.student?.email || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Branch & Year</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {inspectingApp.student?.branch || '—'}, {inspectingApp.student?.year || '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Status</span>
                  <StatusBadge status={inspectingApp.status} size="sm" />
                </div>
              </div>

              {/* Answers */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                  Questionnaire Responses
                </h4>

                {(inspectingApp.answers || []).length === 0 ? (
                  <p className="text-slate-400 italic">No responses provided for this candidate.</p>
                ) : (
                  inspectingApp.answers.map((ans, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 space-y-1.5"
                    >
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {idx + 1}. {ans.question}
                      </p>
                      <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {ans.answer || '—'}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Feedback Note if any */}
              {inspectingApp.feedbackNote && (
                <div className="p-3.5 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/40">
                  <span className="text-xs font-bold text-violet-700 dark:text-violet-300 block mb-1">
                    Attached Feedback Note
                  </span>
                  <p className="text-xs text-slate-700 dark:text-slate-300">
                    {inspectingApp.feedbackNote}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2 bg-slate-50/40 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setInspectingApp(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setUpdatingAppStatus(inspectingApp);
                  setNewStatus(inspectingApp.status || 'Pending');
                  setFeedbackNote(inspectingApp.feedbackNote || '');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white"
              >
                Change Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: UPDATE APPLICATION STATUS & FEEDBACK            */}
      {/* ======================================================== */}
      {updatingAppStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Update Candidate Status
              </h3>
              <button
                type="button"
                onClick={() => setUpdatingAppStatus(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update the pipeline status for{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {updatingAppStatus.student?.fullName || updatingAppStatus.student?.username}
              </span>
              . An in-app notification and email alert will be automatically dispatched.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Select Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['Pending', 'Shortlisted', 'Accepted', 'Rejected'].map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setNewStatus(st)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-center transition-all cursor-pointer ${
                      newStatus === st
                        ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 ring-2 ring-violet-500/20'
                        : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Feedback Note (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Attach guidance or feedback for the candidate (e.g. Interview scheduled for Friday at 4PM)..."
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUpdatingAppStatus(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStatus}
                disabled={isSavingStatus}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSavingStatus ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: PROMOTE USER & ASSIGN SOCIETIES KEYCHAIN        */}
      {/* ======================================================== */}
      {promotingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Manage User Role & Permissions
              </h3>
              <button
                type="button"
                onClick={() => setPromotingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Configure system role and society access keychain for{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {promotingUser.fullName || promotingUser.username}
              </span>
              .
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Role
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
              >
                <option value="student">Student</option>
                <option value="society_admin">Society Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            {/* If promoting to society_admin, show multi-select list of managed societies */}
            {targetRole === 'society_admin' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assign Managed Societies Keychain
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  {allSocieties.map((soc) => {
                    const isChecked = targetManagedSocieties.includes(soc._id);
                    return (
                      <label
                        key={soc._id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTargetManagedSocieties((prev) => [...prev, soc._id]);
                            } else {
                              setTargetManagedSocieties((prev) =>
                                prev.filter((id) => id !== soc._id)
                              );
                            }
                          }}
                          className="rounded text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {soc.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPromotingUser(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePromoteUser}
                disabled={isSavingPromotion}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-md shadow-violet-600/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
              >
                {isSavingPromotion ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Update Role</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
