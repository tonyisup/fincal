import { useForecastContext } from '@/providers/ForecastProvider';
import { Search, SlidersHorizontal } from 'lucide-react';



function cadenceLabel(cadence: string) {
  switch (cadence) {
    case 'biweekly':
      return 'Biweekly';
    case 'semimonthly':
      return 'Semi-monthly';
    default:
      return cadence.charAt(0).toUpperCase() + cadence.slice(1);
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function TuneRulesPage() {
  const { recurringRules, setRecurringRules, updateRule, forecastStartDate, forecastEndDate } = useForecastContext();

  const enabledRuleCount = recurringRules.filter((rule) => rule.enabled).length;
  const totalEnabledRecurring = recurringRules
    .filter((rule) => rule.enabled)
    .reduce((sum, rule) => sum + (rule.direction === 'credit' ? rule.amount : -rule.amount), 0);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tune Rules</h1>
            <p className="text-sm text-muted-foreground mt-1">Review what FinCal thinks repeats. Disable noisy rules and adjust cadence or amount.</p>
          </div>
          <div className="flex gap-3 text-sm">
             <button
                className="rounded-lg bg-emerald-500/20 px-4 py-2 font-semibold text-emerald-500 transition-colors hover:bg-emerald-500/30"
                onClick={() => setRecurringRules((current) => current.map((rule) => ({ ...rule, enabled: true })))}
             >
                Enable all
             </button>
             <button
                className="rounded-lg border border-border/50 bg-background/50 px-4 py-2 font-medium transition-colors hover:bg-muted"
                onClick={() => setRecurringRules((current) => current.map((rule) => ({ ...rule, enabled: false })))}
             >
                Disable all
             </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          {/* Rules Table Area */}
          <div className="rounded-xl border border-border/40 bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-border/40 p-4 bg-muted/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search"
                  className="rounded-full border border-border/50 bg-background/50 pl-9 pr-4 py-1.5 text-sm outline-none w-64 focus:border-emerald-500/50"
                  // Search functionality could be wired here
                />
              </div>
              <div className="flex gap-2 text-muted-foreground">
                <button className="flex h-8 w-8 items-center justify-center rounded border border-border/50 bg-background/50 hover:bg-muted"><SlidersHorizontal className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-card z-10 text-xs uppercase tracking-widest text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3 font-medium w-12 text-center">Status</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium">Cadence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recurringRules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                        No rules found. Import transactions first.
                      </td>
                    </tr>
                  ) : (
                    recurringRules.map(rule => (
                      <tr key={rule.id} className={`transition-colors hover:bg-muted/10 ${!rule.enabled ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <label className={`inline-flex items-center justify-center cursor-pointer w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-emerald-500/20 border-emerald-500/30 border' : 'bg-muted border border-border'}`}>
                             <input type="checkbox" className="sr-only" checked={rule.enabled} onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })} />
                             <span className={`block w-3 shadow-sm h-3 rounded-full transition-transform ${rule.enabled ? 'bg-emerald-500 translate-x-1.5' : 'bg-muted-foreground -translate-x-1.5'}`} />
                          </label>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                           <input
                             className="bg-transparent outline-none w-full"
                             value={rule.label}
                             onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                           />
                        </td>
                        <td className="px-4 py-3 font-medium w-32">
                          <span className={rule.direction === 'credit' ? 'text-emerald-500' : 'text-foreground'}>
                            {rule.direction === 'credit' ? '+' : '-'}{formatCurrency(rule.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-muted-foreground capitalize">{rule.direction === 'credit' ? 'Income' : 'Expense'}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {cadenceLabel(rule.cadence)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Session Snapshot Area */}
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border border-border/40 bg-card p-5 shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">Session Snapshot</h3>
              
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground">Enabled Rules</p>
                  <p className="text-2xl font-semibold mt-1">{enabledRuleCount} / {recurringRules.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net Recurring Flow</p>
                  <p className={`text-2xl font-semibold mt-1 ${totalEnabledRecurring < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {totalEnabledRecurring < 0 ? '-' : '+'}{formatCurrency(Math.abs(totalEnabledRecurring))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Forecast Range</p>
                  <p className="text-sm font-medium mt-1">{forecastStartDate} to {forecastEndDate}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
