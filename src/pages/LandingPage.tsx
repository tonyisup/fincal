import { Button } from "@/components/ui/button";
import { TrendingUp, CalendarCheck2, Wallet } from "lucide-react";

interface LandingPageProps {
  signIn: () => void;
}

export function LandingPage({ signIn }: LandingPageProps) {
  return (
    <div className="flex flex-col min-h-screen w-full">
      <main className="flex-1 w-full max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 text-white">
          <div className="w-full max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                Forecast Your Financial Future
              </h1>
              <p className="mx-auto max-w-[700px] text-gray-200 md:text-xl">
                FinCal integrates with your Google Calendar to turn your specialized "events" into a powerful financial forecast. See your projected balance with a click.
              </p>
              <Button
                onClick={signIn}
              >
                Get Started with Google
              </Button>
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
                  <h3 className="text-xl font-bold">Google Calendar Integration</h3>
                </div>
                <p className="text-muted-foreground">Uses your existing credit and debit calendars. No manual data entry needed. If it's on your calendar, it's in your forecast.</p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-bold">Real-time Balance Forecasting</h3>
                </div>
                <p className="text-muted-foreground">Get a daily projection of your financial health based on upcoming calendar events.</p>
              </div>
              <div className="grid gap-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-6 w-6 text-primary" />
                  <h3 className="text-xl font-bold">Track Income & Expenses</h3>
                </div>
                <p className="text-muted-foreground">Events titled `+$1000` for income or `-$50` for expenses are automatically calculated.</p>
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
                <h3 className="font-bold text-lg">Sign In</h3>
                <p className="text-sm text-muted-foreground">Connect your Google account securely.</p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">2</div>
                <h3 className="font-bold text-lg">Select Calendars</h3>
                <p className="text-sm text-muted-foreground">Choose which calendars track your income and expenses.</p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">3</div>
                <h3 className="font-bold text-lg">Run Forecast</h3>
                <p className="text-sm text-muted-foreground">Enter your current balance, select an end date, and see your financial future.</p>
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
