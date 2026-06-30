import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@react-oauth/google', () => ({
  useGoogleLogin: vi.fn(() => vi.fn()),
  googleLogout: vi.fn(),
}));

vi.mock('react-plaid-link', () => ({
  usePlaidLink: vi.fn(() => ({
    open: vi.fn(),
    ready: true,
  })),
}));

const userProfile = {
  email: 'tester@example.com',
  name: 'Test User',
  picture: '',
};

function mockGoogleFetch() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/oauth2/v3/userinfo')) {
      return Response.json(userProfile);
    }

    if (url.includes('/oauth2/v1/tokeninfo')) {
      return Response.json({
        scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
      });
    }

    if (url.includes('/calendar/v3/users/me/calendarList')) {
      return Response.json({
        items: [
          { id: 'income-calendar', summary: 'Income' },
          { id: 'expense-calendar', summary: 'Expenses' },
        ],
      });
    }

    if (url.includes('/api/create_link_token')) {
      return Response.json({ link_token: 'link-sandbox-test' });
    }

    return Response.json({}, { status: 404 });
  });
}

async function renderAppAt(path: string) {
  window.history.pushState({}, '', path);
  const { default: App } = await import('../src/App');
  return render(<App />);
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal('fetch', mockGoogleFetch());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('App routes', () => {
  it('renders the signed-out landing page', async () => {
    await renderAppAt('/');

    expect(await screen.findByRole('heading', { name: /forecast your financial future/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /get started with google/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy/i })).toBeInTheDocument();
  });

  it('protects authenticated routes when no session is stored', async () => {
    await renderAppAt('/import');

    expect(await screen.findByText(/please sign in to continue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('restores a stored session and renders the forecast controls', async () => {
    localStorage.setItem('fincal_access_token', 'stored-token');
    localStorage.setItem('fincal_user_profile', JSON.stringify(userProfile));

    await renderAppAt('/app');

    expect(await screen.findByText(/income calendar/i)).toBeInTheDocument();
    expect(screen.getByText(/expense calendar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run forecast/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /calendar/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /table/i }));

    await waitFor(() => {
      expect(screen.getByText('When')).toBeInTheDocument();
    });
  });
});
