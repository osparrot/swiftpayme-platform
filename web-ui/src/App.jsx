import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { Login } from './components/auth/Login';
import { Register } from './components/auth/Register';
import { Dashboard } from './pages/Dashboard';
import { AssetDeposit } from './pages/AssetDeposit';
import { Wallet } from './pages/Wallet';
import { Transactions } from './pages/Transactions';
import { Profile } from './pages/Profile';

// Contexts
import { useAuth } from './contexts/AuthContext';
import { useNotification } from './contexts/NotificationContext';

import './styles/globals.css';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Mobile Navigation Component
const MobileNavigation = () => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) return null;
  
  return (
    <div className="mobile-nav md:hidden">
      <div className="flex justify-around items-center">
        <a href="/dashboard" className="flex flex-col items-center p-2 text-xs hover:text-primary transition-colors">
          <div className="w-6 h-6 mb-1">📊</div>
          Dashboard
        </a>
        <a href="/wallet" className="flex flex-col items-center p-2 text-xs hover:text-primary transition-colors">
          <div className="w-6 h-6 mb-1">💰</div>
          Wallet
        </a>
        <a href="/assets" className="flex flex-col items-center p-2 text-xs hover:text-primary transition-colors">
          <div className="w-6 h-6 mb-1">💎</div>
          Assets
        </a>
        <a href="/transactions" className="flex flex-col items-center p-2 text-xs hover:text-primary transition-colors">
          <div className="w-6 h-6 mb-1">📋</div>
          History
        </a>
        <a href="/profile" className="flex flex-col items-center p-2 text-xs hover:text-primary transition-colors">
          <div className="w-6 h-6 mb-1">👤</div>
          Profile
        </a>
      </div>
    </div>
  );
};

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Oops! Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">
            We're sorry, but something unexpected happened. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="btn-responsive bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main Layout Component
const MainLayout = ({ children, showNavbar = true, showFooter = true }) => {
  const { isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showNavbar && (
        <Navbar 
          showNotifications={isAuthenticated}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
      )}
      
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>
      
      <MobileNavigation />
      
      {showFooter && !isAuthenticated && <Footer />}
    </div>
  );
};

// Loading Component
const LoadingScreen = () => (
  <div className="loading-overlay">
    <div className="flex flex-col items-center space-y-4">
      <div className="loading-spinner"></div>
      <p className="text-sm text-muted-foreground">Loading SwiftPayMe...</p>
    </div>
  </div>
);

// App Component
function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Router>
              <div className="App">
                <Routes>
                  {/* Public Routes */}
                  <Route path="/" element={
                    <PublicRoute>
                      <MainLayout>
                        <LandingPage />
                      </MainLayout>
                    </PublicRoute>
                  } />
                  
                  <Route path="/login" element={
                    <PublicRoute>
                      <MainLayout showFooter={false}>
                        <Login />
                      </MainLayout>
                    </PublicRoute>
                  } />
                  
                  <Route path="/register" element={
                    <PublicRoute>
                      <MainLayout showFooter={false}>
                        <Register />
                      </MainLayout>
                    </PublicRoute>
                  } />
                  
                  {/* Protected Routes */}
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Dashboard />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/assets" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <AssetDeposit />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/assets/deposit" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <AssetDeposit />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/wallet" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Wallet />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/transactions" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Transactions />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/profile" element={
                    <ProtectedRoute>
                      <MainLayout>
                        <Profile />
                      </MainLayout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Catch-all route */}
                  <Route path="*" element={
                    <MainLayout>
                      <div className="error-boundary">
                        <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                        <p className="text-gray-600 mb-4">
                          The page you're looking for doesn't exist.
                        </p>
                        <a 
                          href="/" 
                          className="btn-responsive bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          Go Home
                        </a>
                      </div>
                    </MainLayout>
                  } />
                </Routes>
              </div>
            </Router>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

