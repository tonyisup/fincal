// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '@/types/calendar';

interface MockAuth {
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

let mockAuth: MockAuth;

vi.mock('@/App', () => ({
  useAuth: () => mockAuth,
}));

vi.mock('./NavRail', () => ({
  NavRail: () => <nav aria-label="App navigation" />,
}));

import { AppLayout } from './AppLayout';

function renderAppRoute() {
  return render(
    <MemoryRouter initialEntries={['/app']}>
      <Routes>
        <Route path="/" element={<div>Landing page</div>} />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<div>Forecast workspace loaded</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  beforeEach(() => {
    mockAuth = {
      isSignedIn: false,
      accessToken: null,
      userProfile: null,
      isRestoringSession: false,
      hasWriteAccess: false,
      login: vi.fn(),
      grantWriteAccess: vi.fn().mockResolvedValue(false),
      handleLogout: vi.fn(),
      error: null,
    };
  });

  it('renders the app workspace without a Google session', async () => {
    renderAppRoute();

    expect(await screen.findByText('Forecast workspace loaded')).toBeInTheDocument();
    expect(screen.queryByText('Landing page')).not.toBeInTheDocument();
  });
});
