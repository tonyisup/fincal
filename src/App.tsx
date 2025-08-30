import { useState, useEffect, useCallback } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { Loader2 } from 'lucide-react';
import { LandingPage } from './pages/LandingPage';
import { MainApp } from './pages/MainApp';
import type { UserProfile } from './types/calendar';

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

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGapiClient().then(() => setGapiLoaded(true)).catch(console.error);
  }, []);

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
      setUserProfile({
        email: data.email,
        picture: data.picture,
        name: data.name,
      });
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setError("Failed to fetch user profile.");
    }
  }, []);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      window.gapi.client.setToken({ access_token: tokenResponse.access_token });
      setIsSignedIn(true);
      await fetchUserProfile(tokenResponse.access_token);
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
    // Keep user settings in localStorage
  };

  if (!gapiLoaded) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Loading Google API...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <>
      {isSignedIn && gapiLoaded ? (
        <MainApp userProfile={userProfile} handleLogout={handleLogout} />
      ) : (
        <LandingPage signIn={() => login()} />
      )}
    </>
  );
}

export default App;