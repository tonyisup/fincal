import { ArrowRight, Check } from "lucide-react";

interface LandingPageProps {
  signIn: () => void;
}

const forecastRows = [
  { date: "Jul 22", label: "Client retainer", amount: "+$2,450", tone: "positive" },
  { date: "Jul 25", label: "Studio rent", amount: "−$1,825", tone: "negative" },
  { date: "Aug 02", label: "Card payment", amount: "−$786", tone: "negative" },
];

const features = [
  {
    number: "01",
    title: "Your calendar becomes the ledger",
    copy: "Keep using the calendar you already know. FinCal reads income and expense events without another round of data entry.",
  },
  {
    number: "02",
    title: "See the balance between the dates",
    copy: "Every scheduled payment rolls into a daily running balance, so the expensive weeks become visible before they arrive.",
  },
  {
    number: "03",
    title: "Change the plan, not the spreadsheet",
    copy: "Move a calendar event and run the forecast again. Your outlook stays tied to the schedule that actually drives it.",
  },
];

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function LandingPage({ signIn }: LandingPageProps) {
  return (
    <div className="landing-shell">
      <a className="skip-link" href="#main-content">Skip to content</a>

      <header className="landing-header">
        <a className="brand" href="/" aria-label="FinCal home">
          <BrandMark />
          <span>FinCal</span>
        </a>

        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#features">Why FinCal</a>
          <a href="#how-it-works">How it works</a>
        </nav>

        <button className="header-sign-in" type="button" onClick={signIn}>
          Sign in
          <ArrowRight aria-hidden="true" />
        </button>
      </header>

      <main id="main-content">
        <section className="hero-section" aria-labelledby="hero-heading">
          <div className="hero-copy">
            <p className="eyebrow"><span /> Google Calendar in. Cash-flow forecast out.</p>
            <h1 id="hero-heading">Know your balance <em>before</em> the month begins.</h1>
            <p className="hero-lede">
              FinCal turns scheduled income and expenses into a clear daily forecast—without asking you to maintain another financial system.
            </p>
            <div className="hero-actions">
              <button className="primary-cta" type="button" onClick={signIn}>
                <span className="google-g" aria-hidden="true">G</span>
                Continue with Google
                <ArrowRight aria-hidden="true" />
              </button>
              <a className="text-link" href="#how-it-works">See how it works <span aria-hidden="true">↓</span></a>
            </div>
            <ul className="trust-list" aria-label="Product details">
              <li><Check aria-hidden="true" /> Read-only access to start</li>
              <li><Check aria-hidden="true" /> No bank login required</li>
            </ul>
          </div>

          <div className="forecast-stage" aria-label="Sample FinCal forecast">
            <div className="stage-note stage-note-top">A month, at a glance</div>
            <article className="forecast-card">
              <header className="forecast-card-header">
                <div>
                  <p>Projected balance</p>
                  <strong>$5,840<span>.00</span></strong>
                </div>
                <div className="forecast-period">
                  <span>30 days</span>
                  <small>Jul 19 — Aug 18</small>
                </div>
              </header>

              <div className="chart-wrap" aria-hidden="true">
                <div className="chart-label chart-label-high">$6k</div>
                <div className="chart-label chart-label-low">$2k</div>
                <svg viewBox="0 0 640 220" role="img">
                  <defs>
                    <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d7ff66" stopOpacity=".22" />
                      <stop offset="100%" stopColor="#d7ff66" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path className="chart-area" d="M0,153 C65,151 91,127 150,132 S251,87 306,101 S398,73 444,114 S541,79 640,52 L640,220 L0,220 Z" />
                  <path className="chart-line" d="M0,153 C65,151 91,127 150,132 S251,87 306,101 S398,73 444,114 S541,79 640,52" />
                  <circle cx="444" cy="114" r="7" />
                </svg>
                <div className="chart-tooltip"><span>Projected low</span><strong>$2,180</strong><small>Aug 02</small></div>
              </div>

              <div className="forecast-list">
                <div className="forecast-list-heading"><span>Upcoming</span><span>Amount</span></div>
                {forecastRows.map((row) => (
                  <div className="forecast-row" key={`${row.date}-${row.label}`}>
                    <time>{row.date}</time>
                    <span>{row.label}</span>
                    <strong className={row.tone}>{row.amount}</strong>
                  </div>
                ))}
              </div>
            </article>
            <div className="stage-note stage-note-bottom">Built from events already on your calendar</div>
          </div>
        </section>

        <section className="proof-strip" aria-label="FinCal workflow">
          <p>One simple loop</p>
          <div><span>Schedule</span><i>→</i><span>Forecast</span><i>→</i><span>Decide</span></div>
        </section>

        <section className="features-section" id="features" aria-labelledby="features-heading">
          <div className="section-intro">
            <p className="eyebrow"><span /> A calmer way to look ahead</p>
            <h2 id="features-heading">Cash flow is a timing problem. FinCal makes the timing visible.</h2>
          </div>

          <div className="feature-list">
            {features.map((feature) => (
              <article className="feature-row" key={feature.number}>
                <span className="feature-number">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="how-section" id="how-it-works" aria-labelledby="how-heading">
          <div className="how-heading-wrap">
            <p className="eyebrow light"><span /> From sign-in to forecast</p>
            <h2 id="how-heading">Three minutes to a useful view of next month.</h2>
          </div>
          <ol className="steps-list">
            <li>
              <span>1</span>
              <div><h3>Connect Google</h3><p>Choose the account that holds your financial calendars.</p></div>
            </li>
            <li>
              <span>2</span>
              <div><h3>Choose two calendars</h3><p>Tell FinCal where income and expense events live.</p></div>
            </li>
            <li>
              <span>3</span>
              <div><h3>Set your starting balance</h3><p>Pick a forecast range and see the daily balance take shape.</p></div>
            </li>
          </ol>
          <button className="light-cta" type="button" onClick={signIn}>
            Build my forecast <ArrowRight aria-hidden="true" />
          </button>
        </section>

        <section className="closing-section" aria-labelledby="closing-heading">
          <BrandMark />
          <p>Plan with the dates you already trust.</p>
          <h2 id="closing-heading">See the month before it happens.</h2>
          <button className="primary-cta" type="button" onClick={signIn}>
            Continue with Google <ArrowRight aria-hidden="true" />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="brand"><BrandMark /><span>FinCal</span></div>
        <p>Calendar-based cash-flow forecasting.</p>
        <nav aria-label="Legal">
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy</a>
        </nav>
        <small>© {new Date().getFullYear()} FinCal</small>
      </footer>
    </div>
  );
}
