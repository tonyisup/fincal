import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Button>

      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
          <p>
            Welcome to FinCal. We respect your privacy and are committed to protecting your personal data.
            This privacy policy will inform you as to how we look after your personal data when you visit our
            application and tell you about your privacy rights and how the law protects you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Data We Collect</h2>
          <p className="mb-2">
            We collect and process the following data:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Google User Data:</strong> When you sign in with Google, we access your basic profile information (name, email, profile picture) to identify you.
            </li>
            <li>
              <strong>Calendar Data:</strong> We access your Google Calendar events to calculate financial forecasts. This includes event titles, dates, and recurring patterns.
            </li>
            <li>
              <strong>Usage Data:</strong> We store your application preferences (such as selected calendars and display settings) locally on your device.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. How We Use Your Data</h2>
          <p>
            We use your data solely to provide the FinCal service. Specifically:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-2">
            <li>To authenticate you and maintain your session.</li>
            <li>To fetch calendar events and compute your financial balance forecast.</li>
            <li>To persist your user preferences across sessions.</li>
          </ul>
          <p className="mt-2">
            <strong>We do not sell your personal data to third parties.</strong>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
          <p>
            FinCal operates primarily as a client-side application. Your calendar data is fetched directly from Google's APIs to your browser
            and is processed locally. We do not store your calendar events or financial data on our servers.
            Authentication tokens and user preferences are stored securely in your browser's local storage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Third-Party Services</h2>
          <p>
            Our service integrates with Google APIs. Please review Google's Privacy Policy to understand how they handle your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
          <p>
            You have the right to revoke our access to your Google account at any time via your Google Account security settings.
            You may also clear your local browser storage to remove stored preferences.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy or our privacy practices, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
