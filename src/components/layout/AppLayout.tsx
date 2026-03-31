import { Outlet } from 'react-router-dom';
import { NavRail } from './NavRail';
import { ForecastProvider } from '@/providers/ForecastProvider';

export function AppLayout() {
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
