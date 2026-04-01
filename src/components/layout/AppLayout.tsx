import { Outlet, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { NavRail } from './NavRail';
import { ForecastProvider } from '@/providers/ForecastProvider';
import { useAuth } from '@/App';

export function AppLayout() {
  const { isRestoringSession, isSignedIn } = useAuth();

  if (isRestoringSession) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return (
    <ForecastProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <NavRail />
        <main className="flex flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
    </ForecastProvider>
  );
}