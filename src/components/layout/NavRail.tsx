import { Link, useLocation } from 'react-router-dom';
import { Home, SlidersHorizontal, Upload, Settings } from 'lucide-react';
import { useAuth } from '@/App'; // Ensure this exists or pass it from App

export function NavRail() {
  const location = useLocation();
  const { userProfile, handleLogout } = useAuth();

  const navItems = [
    { icon: Home, path: '/app/forecast', label: 'Forecast' },
    { icon: SlidersHorizontal, path: '/app/tune', label: 'Tune Rules' },
    { icon: Upload, path: '/app/import', label: 'Import History' },
  ];

  return (
    <div className="flex h-screen w-16 flex-col items-center justify-between border-r border-border/40 bg-card/40 py-4 z-50">
      <div className="flex flex-col items-center gap-6">
        {/* App Logo / Branding */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 mb-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>

        {/* Top Nav Links */}
        <nav className="flex flex-col items-center gap-3">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Bottom actions */}
        <button
          title="Settings"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
        </button>
        {userProfile && (
          <button
            onClick={handleLogout}
            title="Log out"
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors hover:bg-muted/50 hover:text-foreground mt-2"
          >
            <img src={userProfile.picture} alt={userProfile.name} className="h-7 w-7 rounded-full" />
          </button>
        )}
      </div>
    </div>
  );
}
