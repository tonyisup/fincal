import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LandingPage } from './pages/LandingPage';
import { MainApp } from './pages/MainApp';
import type { UserProfile } from './types/calendar';
import { Spinner } from './components/ui/spinner';

// Load Google API client library
const loadGapiClient = () => {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      window.gapi.load('client', () => {
        window.gapi.client.init({
          apiKey: import.meta.env.GOOGLE_API_KEY,
          // discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
        })
        .then(() => resolve())
        .catch((err) => reject(err));
      });
    };
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

// Storage keys for persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fincal_access_token',
  USER_PROFILE: 'fincal_user_profile',
};

// Auth context
interface AuthContextType {
  isSignedIn: boolean;
  userProfile: UserProfile | null;
  gapiLoaded: boolean;
  isRestoringSession: boolean;
  login: () => void;
  handleLogout: () => void;
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
  const { isSignedIn, isRestoringSession, gapiLoaded } = useAuth();

  if (!gapiLoaded || isRestoringSession || !isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Auth Provider Component
function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadGapiClient().then(() => setGapiLoaded(true)).catch(console.error);
    // setGapiLoaded(true); // Fake load for test
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const storedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);

        if (storedToken && storedProfile && gapiLoaded) {
          const profile: UserProfile = JSON.parse(storedProfile);
          
          // Set the token in gapi client
          if (window.gapi && window.gapi.client) {
            window.gapi.client.setToken({ access_token: storedToken });
          }

          // Verify token is still valid by fetching user profile
          try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            });

            if (response.ok) {
              // Token is valid, restore session
              setUserProfile(profile);
              setIsSignedIn(true);
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

    if (gapiLoaded) {
      restoreSession();
    } else {
      setIsRestoringSession(false);
    }
  }, [gapiLoaded]);

  const fetchUserProfile = useCallback(async (accessToken: string) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
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
      const accessToken = tokenResponse.access_token;
      
      // Store token in localStorage for persistence
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      
      window.gapi.client.setToken({ access_token: accessToken });
      setIsSignedIn(true);
      await fetchUserProfile(accessToken);
      navigate('/app');
    },
    onError: (errorResponse) => {
      console.error("Login Failed:", errorResponse);
      setError("Google login failed.");
    },
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  });

  const handleLogout = () => {
    googleLogout();
    if (window.gapi && window.gapi.client) {
      window.gapi.client.setToken(null);
    }
    setIsSignedIn(false);
    setUserProfile(null);
    
    // Clear stored authentication data
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    // Keep user settings in localStorage (other keys remain)
    navigate('/');
  };

  const value: AuthContextType = {
    isSignedIn,
    userProfile,
    gapiLoaded,
    isRestoringSession,
    login,
    handleLogout,
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Routes Component
function AppRoutes() {
  const { isSignedIn, isRestoringSession, gapiLoaded, userProfile, handleLogout, login } = useAuth();

  // Show loading while restoring session or loading GAPI
  if (!gapiLoaded || isRestoringSession) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Loading Google API...</span>
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
            <MainApp userProfile={userProfile} handleLogout={handleLogout} />
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