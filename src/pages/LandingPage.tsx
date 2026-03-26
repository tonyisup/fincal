import { Button } from "@/components/ui/button";
import { TrendingUp, CalendarCheck2, Wallet } from "lucide-react";
import { Link } from "react-router-dom";

interface LandingPageProps {
  signIn: () => void;
}

export function LandingPage({ signIn }: LandingPageProps) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-emerald-500 via-cyan-600 to-slate-900 text-white">
          <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Upload Transactions. Forecast Cash Flow.
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl">
                FinCal turns transaction exports into a forward-looking balance forecast. Start with CSV or Excel, confirm recurring income and bills, and optionally sync the result to Google Calendar.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg">
                  <Link to="/app">Start Forecasting Free</Link>
                </Button>
                <Button onClick={signIn} variant="secondary" size="lg">
                  Connect Google for Export
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Know, In One Place</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text/base/relaxed xl:text-xl/relaxed">
                Connect your calendars, set your balance, and let FinCal do the rest.
              </p>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <CalendarCheck2 className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-bold">Optional Google Calendar Sync</h3>
                </div>
                <p className="text-muted-foreground">Keep calendar export as a bonus workflow, not a requirement. Forecast inside FinCal first, then push recurring items to Google if you want reminders.</p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-bold">Forward-Looking Cash Flow</h3>
                </div>
                <p className="text-muted-foreground">See when your balance may dip before payday and spot the lowest point in your next 30, 60, or 90 days.</p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-bold">Import CSV Or Excel</h3>
                </div>
                <p className="text-muted-foreground">Upload transaction exports, map columns once, and let FinCal detect recurring income and expenses for you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="w-full max-w-6xl mx-auto grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">How It Works</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Getting started with FinCal is as easy as 1-2-3.
              </p>
            </div>
            <div className="mx-auto w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
              <div className="flex flex-col gap-2 items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">1</div>
                <h3 className="font-bold text-lg">Import</h3>
                <p className="text-sm text-muted-foreground">Upload a CSV or Excel export from your bank, card, or finance tool.</p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">2</div>
                <h3 className="font-bold text-lg">Confirm Recurring Rules</h3>
                <p className="text-sm text-muted-foreground">Review FinCal's recurring pay and bill detection, then adjust anything noisy.</p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">3</div>
                <h3 className="font-bold text-lg">See The Forecast</h3>
                <p className="text-sm text-muted-foreground">Set your current balance, pick a horizon, and see your projected future balance instantly.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center justify-between px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} FinCal. All rights reserved.</p>
        <nav className="flex gap-4 sm:gap-6">
          <a className="text-xs hover:underline underline-offset-4" href="/terms">
            Terms of Service
          </a>
          <a className="text-xs hover:underline underline-offset-4" href="/privacy">
            Privacy
          </a>
        </nav>
      </footer>
    </div>
  );
}
