import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsOfService() {
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

      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="space-y-6 text-foreground">
        <section>
          <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
          <p>
            By accessing and using FinCal, you accept and agree to be bound by the terms and provision of this agreement.
            In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
          <p>
            FinCal provides a financial forecasting tool that integrates with Google Calendar to project future account balances based on scheduled events.
            The service is provided "as is" and is intended for informational purposes only.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. User Obligations</h2>
          <p>
            You agree to use the service only for lawful purposes. You are responsible for maintaining the confidentiality of your account
            and for all activities that occur under your account. You agree not to misuse the service or help anyone else do so.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Intellectual Property</h2>
          <p>
            The service and its original content, features, and functionality are and will remain the exclusive property of FinCal and its licensors.
            The service is protected by copyright, trademark, and other laws.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Termination</h2>
          <p>
            We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever,
            including without limitation if you breach the Terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Disclaimer of Warranties</h2>
          <p>
            The service is provided on an "AS IS" and "AS AVAILABLE" basis. FinCal makes no representations or warranties of any kind,
            express or implied, as to the operation of their services, or the information, content, or materials included therein.
            You expressly agree that your use of these services, their content, and any services or items obtained from us is at your sole risk.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Limitation of Liability</h2>
          <p>
            In no event shall FinCal, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect,
            incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill,
            or other intangible losses, resulting from your access to or use of or inability to access or use the service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Changes to Terms</h2>
          <p>
            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change
            will be determined at our sole discretion.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us.
          </p>
        </section>
      </div>
    </div>
  );
}
