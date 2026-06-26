import { Link, useLocation } from 'react-router-dom';
import { Home, SlidersHorizontal, Upload, Settings } from 'lucide-react';
import { useAuth } from '@/App';
import { useTheme } from '@/providers/theme-provider';
import type { Theme } from '@/providers/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function NavRail() {
  const location = useLocation();
  const { userProfile, handleLogout } = useAuth();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { icon: Home, path: '/app/forecast', label: 'Forecast' },
    { icon: SlidersHorizontal, path: '/app/tune', label: 'Tune Rules' },
    { icon: Upload, path: '/app/import', label: 'Import History' },
  ];

  return (
    <div className="flex h-screen w-56 flex-col justify-between border-r border-border/40 bg-card/40 py-4 z-50">
      <div className="flex flex-col items-center gap-6">
        <div className="flex w-full items-center gap-3 px-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">FinCal</div>
            <div className="text-xs text-muted-foreground">Forecast workspace</div>
          </div>
        </div>

        <nav className="flex w-full flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              title="Settings"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground bg-transparent border-none appearance-none"
            >
              <Settings className="h-5 w-5" />
              <span className="font-medium">Settings</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={12}>
            <DropdownMenuLabel>Appearance</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={theme} onValueChange={(v: string) => setTheme(v as Theme)}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {userProfile && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title={userProfile.name}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-muted/50 hover:text-foreground bg-transparent border-none appearance-none"
              >
                <img src={userProfile.picture} alt={userProfile.name} className="h-7 w-7 rounded-full" />
                <span className="min-w-0 truncate font-medium text-foreground">{userProfile.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={12}>
              <DropdownMenuLabel>{userProfile.name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
