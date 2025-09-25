import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('swiftpayme_admin_token');
      if (token) {
        const userData = await authService.validateToken(token);
        if (userData) {
          setUser(userData);
          setIsAuthenticated(true);
          setPermissions(userData.permissions || []);
        } else {
          localStorage.removeItem('swiftpayme_admin_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('swiftpayme_admin_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authService.login(credentials);
      
      if (response.success) {
        const { token, user: userData } = response.data;
        
        localStorage.setItem('swiftpayme_admin_token', token);
        setUser(userData);
        setIsAuthenticated(true);
        setPermissions(userData.permissions || []);
        
        return { success: true };
      } else {
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('swiftpayme_admin_token');
      setUser(null);
      setIsAuthenticated(false);
      setPermissions([]);
    }
  };

  const hasPermission = (permission) => {
    return permissions.includes(permission) || permissions.includes('super_admin');
  };

  const hasAnyPermission = (permissionList) => {
    return permissionList.some(permission => hasPermission(permission));
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    permissions,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

