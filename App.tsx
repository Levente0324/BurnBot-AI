import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import LandingPage from "./components/LandingPage";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import { getSession, onAuthStateChange, signOut } from "./services/authService";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    getSession().then((session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth changes (login, logout, token refresh)
    const unsubscribe = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-white text-lg font-mono animate-pulse">
          Loading BurnBot...
        </div>
      </div>
    );
  }

  const isAuthenticated = !!user;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Auth mode="login" />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="/signup"
          element={
            !isAuthenticated ? (
              <Auth mode="signup" />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          }
        />

        <Route
          path="/dashboard"
          element={
            <RequireAuth isAuthenticated={isAuthenticated}>
              <Dashboard user={user!} onLogout={handleLogout} />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

// Protected Route Component
const RequireAuth: React.FC<{
  isAuthenticated: boolean;
  children: React.ReactNode;
}> = ({ isAuthenticated, children }) => {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/signup" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default App;
