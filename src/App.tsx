import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { LandingPage } from './pages/LandingPage';
import { MainApp } from './pages/MainApp';
import { ImportTransactions } from './pages/ImportTransactions';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsOfService } from './pages/TermsOfService';
import type { UserProfile } from './types/calendar';
import { Spinner } from './components/ui/spinner';
import { Button } from './components/ui/button';

// Storage keys for persistence
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fincal_access_token',
  USER_PROFILE: 'fincal_user_profile',
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "dummy_id";
const READ_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
const WRITE_SCOPE = 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events';
const OAUTH_REDIRECT_PATH = '/oauth2/callback';
const OAUTH_STATE_PREFIX = 'fincal_oauth_redirect_';

type OAuthRedirectMode = 'login' | 'write';

type OAuthRedirectState = {
  mode: OAuthRedirectMode;
  returnPath: string;
  createdAt: number;
};

type OAuthRedirectResult =
  | { type: 'none' }
  | { type: 'success'; accessToken: string; state: OAuthRedirectState }
  | { type: 'error'; message: string };

function getOAuthRedirectUri() {
  return `${window.location.origin}${OAUTH_REDIRECT_PATH}`;
}

function createOAuthNonce() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function startOAuthRedirect(scope: string, mode: OAuthRedirectMode, returnPath: string) {
  const nonce = createOAuthNonce();
  const redirectState: OAuthRedirectState = {
    mode,
    returnPath,
    createdAt: Date.now(),
  };

  sessionStorage.setItem(`${OAUTH_STATE_PREFIX}${nonce}`, JSON.stringify(redirectState));

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', getOAuthRedirectUri());
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', scope);
  authUrl.searchParams.set('state', nonce);
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('enable_granular_consent', 'true');
  authUrl.searchParams.set('prompt', 'select_account');

  window.location.assign(authUrl.toString());
}

function consumeOAuthRedirect(): OAuthRedirectResult {
  if (!window.location.hash) {
    return { type: 'none' };
  }

  const params = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = params.get('access_token');
  const error = params.get('error');
  const state = params.get('state');

  if (!accessToken && !error) {
    return { type: 'none' };
  }

  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

  if (!state) {
    return { type: 'error', message: 'Google sign-in response was missing state. Please try again.' };
  }

  const storageKey = `${OAUTH_STATE_PREFIX}${state}`;
  const storedState = sessionStorage.getItem(storageKey);
  sessionStorage.removeItem(storageKey);

  if (!storedState) {
    return { type: 'error', message: 'Google sign-in session expired. Please try again.' };
  }

  const redirectState: OAuthRedirectState = JSON.parse(storedState);
  if (Date.now() - redirectState.createdAt > 10 * 60 * 1000) {
    return { type: 'error', message: 'Google sign-in session expired. Please try again.' };
  }

  if (error) {
    return { type: 'error', message: `Google sign-in failed: ${error}` };
  }

  if (!accessToken) {
    return { type: 'error', message: 'Google sign-in did not return an access token. Please try again.' };
  }

  return { type: 'success', accessToken, state: redirectState };
}

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

  if (isRestoringSession) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex justify-center items-center h-screen flex-col gap-4">
        <p className="text-muted-foreground">Please sign in to continue.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
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

  // Promise resolver for the write access flow.
  const writeAccessResolveRef = useRef<((granted: boolean) => void) | null>(null);

  const getCurrentReturnPath = useCallback(() => {
    return `${window.location.pathname}${window.location.search}`;
  }, []);

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

  const completeSignIn = useCallback(async (token: string, returnPath = '/app') => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    setAccessToken(token);

    setIsSignedIn(true);
    await fetchUserProfile(token);
    checkScopes(token);
    navigate(returnPath);
  }, [checkScopes, fetchUserProfile, navigate]);

  // Restore session from localStorage on mount, or complete OAuth redirect fallback.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const redirectResult = consumeOAuthRedirect();

        if (redirectResult.type === 'error') {
          setError(redirectResult.message);
          navigate('/');
          return;
        }

        if (redirectResult.type === 'success') {
          const storedProfile = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, redirectResult.accessToken);
          setAccessToken(redirectResult.accessToken);
          setIsSignedIn(true);

          if (storedProfile) {
            setUserProfile(JSON.parse(storedProfile));
          }

          if (redirectResult.state.mode === 'login' || !storedProfile) {
            await fetchUserProfile(redirectResult.accessToken);
          }

          if (redirectResult.state.mode === 'write') {
            setHasWriteAccess(true);
          }

          checkScopes(redirectResult.accessToken);
          navigate(redirectResult.state.returnPath);
          return;
        }

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
  }, [checkScopes, fetchUserProfile, navigate]);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      await completeSignIn(tokenResponse.access_token);
    },
    onError: (errorResponse) => {
      console.error("Login Failed:", errorResponse);
      setError("Google login failed.");
    },
    onNonOAuthError: (nonOAuthError) => {
      console.error("Google login popup failed:", nonOAuthError);
      if (nonOAuthError.type === 'popup_failed_to_open') {
        startOAuthRedirect(READ_SCOPE, 'login', '/app');
        return;
      }

      setError("Google sign-in was cancelled before it completed.");
    },
    scope: READ_SCOPE,
  });

  const login = useCallback(() => {
    setError(null);
    googleLogin();
  }, [googleLogin]);

  const loginForWrite = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      setAccessToken(token);
      setHasWriteAccess(true);

      writeAccessResolveRef.current?.(true);
      writeAccessResolveRef.current = null;
    },
    onError: (errorResponse) => {
      console.error("Write Access Login Failed:", errorResponse);
      writeAccessResolveRef.current?.(false);
      writeAccessResolveRef.current = null;
    },
    onNonOAuthError: (nonOAuthError) => {
      console.error("Write access popup failed:", nonOAuthError);
      writeAccessResolveRef.current?.(false);
      writeAccessResolveRef.current = null;
      if (nonOAuthError.type === 'popup_failed_to_open') {
        startOAuthRedirect(WRITE_SCOPE, 'write', getCurrentReturnPath());
        return;
      }

      setError("Google permission upgrade was cancelled before it completed.");
    },
    scope: WRITE_SCOPE,
  });

  const grantWriteAccess = useCallback(() => {
    return new Promise<boolean>((resolve) => {
      writeAccessResolveRef.current = resolve;
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
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path={OAUTH_REDIRECT_PATH} element={<Navigate to="/" replace />} />
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
