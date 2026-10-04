/**
 * Authentication Context
 *
 * Manages user authentication state, tokens, and core auth workflows (login, register, logout).
 * Persists session data in localStorage and synchronizes with the API.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { axiosInstance } from '../api/axiosInstance';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize token from localStorage
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  // Initialize user profile from localStorage with defensive parsing
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) return null;
    try {
      return JSON.parse(savedUser);
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Synchronize user profile on initial load if token exists
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await axiosInstance.get('/auth/me');
          if (isMounted && res.data?.user) {
            setUser(res.data.user);
            localStorage.setItem('user', JSON.stringify(res.data.user));
          }
        } catch (error) {
          // If token is invalid or expired, gracefully log out
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (isMounted) {
              setToken(null);
              setUser(null);
            }
          }
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  /**
   * Log in user with identifier (email or username) and password
   * @param {Object} credentials - { identifier, password }
   * @returns {Promise<Object>} API response data
   */
  const login = async (credentials) => {
    const res = await axiosInstance.post('/auth/login', credentials);
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    return res.data;
  };

  /**
   * Register a new user account
   * @param {Object} userData - { username, email, password }
   * @returns {Promise<Object>} API response data
   */
  const register = async (userData) => {
    const res = await axiosInstance.post('/auth/register', userData);
    const { token: receivedToken, user: receivedUser } = res.data;

    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('token', receivedToken);
    localStorage.setItem('user', JSON.stringify(receivedUser));

    return res.data;
  };

  /**
   * Clear session and log out the user
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /**
   * Update the locally stored user profile after profile modifications
   * @param {Object} updatedFields - partial or full updated user object
   */
  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    updateUser,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook for accessing authentication state and actions
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
