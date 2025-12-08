import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LandingPage } from './pages/LandingPage';
import { MainApp } from './pages/MainApp';
import { ImportTransactions } from './pages/ImportTransactions';
import type { UserProfile } from './types/calendar';
import { Spinner } from './components/ui/spinner';
import { Button } from './components/ui/button';

// Storage keys for persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fincal_access_token',
  USER_PROFILE: 'fincal_user_profile',
};

// Auth context
interface AuthContextType {
  isSignedIn: boolean;
  accessToken: string | null;
  userProfile: UserProfile | null;
  isRestoringSession: boolean;
  hasWriteAccess: boolean;
  login: () => void;
  grantWriteAccess: () => Promise<boolean>;
  handleLogout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isRestoringSession, login, error } = useAuth();
  const [hasRequestedLogin, setHasRequestedLogin] = useState(false);

  useEffect(() => {
    if (!isRestoringSession && !isSignedIn && !hasRequestedLogin) {
      setHasRequestedLogin(true);
      login();
    }
  }, [isRestoringSession, isSignedIn, hasRequestedLogin, login]);

  if (isRestoringSession) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  // If error occurred (e.g. user cancelled login), redirect to landing
  if (error && !isSignedIn) {
    return <Navigate to="/" replace />;
  }

  if (!isSignedIn) {
    // Show spinner while waiting for login interaction
    return (
      <div className="flex justify-center items-center h-screen flex-col gap-4">
        <Spinner />
        <p className="text-muted-foreground">Please sign in to continue...</p>
        <Button onClick={() => login()} variant="default">
          Sign In
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}

// Auth Provider Component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);
  const navigate = useNavigate();

  // Promise resolver for the write access flow
  const [writeAccessResolve, setWriteAccessResolve] = useState<((granted: boolean) => void) | null>(null);

  const checkScopes = useCallback(async (token: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
      if (response.ok) {
        const data = await response.json();
        const scopes = data.scope.split(' ');
        const hasCalendar = scopes.includes('https://www.googleapis.com/auth/calendar');
        const hasEvents = scopes.includes('https://www.googleapis.com/auth/calendar.events');
        setHasWriteAccess(hasCalendar || hasEvents);
      }
    } catch (err) {
      console.error("Error checking scopes:", err);
    }
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const storedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);

        if (storedToken && storedProfile) {
          const profile: UserProfile = JSON.parse(storedProfile);

          // Verify token is still valid by fetching user profile
          try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            });

            if (response.ok) {
              // Token is valid, restore session
              setAccessToken(storedToken);
              setUserProfile(profile);
              setIsSignedIn(true);
              // Check scopes
              checkScopes(storedToken);
            } else {
              // Token expired or invalid, clear storage
              localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
              localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
            }
          } catch (err) {
            // Token validation failed, clear storage
            console.error("Token validation failed:", err);
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
          }
        }
      } catch (err) {
        console.error("Error restoring session:", err);
        // Clear potentially corrupted data
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      } finally {
        setIsRestoringSession(false);
      }
    };

    restoreSession();
  }, [checkScopes]);

  const fetchUserProfile = useCallback(async (token: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch profile: ${response.statusText}`);
      }
      const data = await response.json();
      const profile: UserProfile = {
        email: data.email,
        picture: data.picture,
        name: data.name,
      };
      setUserProfile(profile);

      // Store in localStorage for persistence
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to fetch user profile.");
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;

      // Store token in localStorage for persistence
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      setAccessToken(token);

      setIsSignedIn(true);
      await fetchUserProfile(token);
      checkScopes(token);
      navigate('/app');
    },
    onError: (errorResponse) => {
      console.error("Login Failed:", errorResponse);
      setError("Google login failed.");
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  const loginForWrite = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      setAccessToken(token);
      setHasWriteAccess(true);

      if (writeAccessResolve) {
        writeAccessResolve(true);
        setWriteAccessResolve(null);
      }
    },
    onError: (errorResponse) => {
      console.error("Write Access Login Failed:", errorResponse);
      if (writeAccessResolve) {
        writeAccessResolve(false);
        setWriteAccessResolve(null);
      }
    },
    scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
  });

  const grantWriteAccess = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      setWriteAccessResolve(() => resolve);
      loginForWrite();
    });
  }, [loginForWrite]);

  const handleLogout = () => {
    googleLogout();
    setIsSignedIn(false);
    setAccessToken(null);
    setUserProfile(null);
    setHasWriteAccess(false);

    // Clear stored authentication data
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    // Keep user settings in localStorage (other keys remain)
    navigate('/');
  };

  const value: AuthContextType = {
    isSignedIn,
    accessToken,
    userProfile,
    isRestoringSession,
    hasWriteAccess,
    login,
    grantWriteAccess,
    handleLogout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Routes Component
function AppRoutes() {
  const { isSignedIn, isRestoringSession, userProfile, accessToken, handleLogout, login, hasWriteAccess, grantWriteAccess } = useAuth();

  // Show loading while restoring session
  if (isRestoringSession) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isSignedIn ? (
            <Navigate to="/app" replace />
          ) : (
            <LandingPage signIn={login} />
          )
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <MainApp
              userProfile={userProfile}
              accessToken={accessToken}
              handleLogout={handleLogout}
              hasWriteAccess={hasWriteAccess}
              grantWriteAccess={grantWriteAccess}
            />
          </ProtectedRoute>
        }
      />
      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <ImportTransactions />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

// Main App Component
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
