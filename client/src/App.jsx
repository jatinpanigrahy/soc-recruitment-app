/**
 * Application Root
 *
 * Configures top-level context providers (Theme, Auth) and client-side
 * routing across public, discovery, authentication, user profile, and student recruitment views.
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import SocietyDetailPage from './pages/SocietyDetailPage';
import QuizPage from './pages/QuizPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import ApplyPage from './pages/ApplyPage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
            <Routes>
              {/* Public & Discovery Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/societies/:id" element={<SocietyDetailPage />} />
              <Route path="/quiz" element={<QuizPage />} />

              {/* Authentication Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

              {/* Protected Profile Route */}
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Recruitment Application Route */}
              <Route
                path="/apply/:societyId"
                element={
                  <ProtectedRoute>
                    <ApplyPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Student Dashboard Route */}
              <Route
                path="/dashboard/student"
                element={
                  <ProtectedRoute>
                    <StudentDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Command Center Route */}
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={['society_admin', 'super_admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback alias for generic student dashboard link */}
              <Route
                path="/dashboard"
                element={<Navigate to="/dashboard/student" replace />}
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
