import { useForecastContext } from '@/providers/ForecastProvider';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<'all' | 'credit' | 'debit'>('all');
  const [filterCadence, setFilterCadence] = useState<string[]>([]);

  const filteredRules = useMemo(() => {
    return recurringRules.filter(rule => {
      // Search term check
      const matchesSearch = rule.label.toLowerCase().includes(searchTerm.toLowerCase()) || rule.amount.toString().includes(searchTerm);

      // Direction check
      const matchesDirection = filterDirection === 'all' || rule.direction === filterDirection;

      // Amount check
      const min = minAmount ? parseFloat(minAmount) : 0;
      const max = maxAmount ? parseFloat(maxAmount) : Infinity;
      const matchesAmount = rule.amount >= min && rule.amount <= max;

      // Cadence check
      const matchesCadence = filterCadence.length === 0 || filterCadence.includes(rule.cadence);

      return matchesSearch && matchesDirection && matchesAmount && matchesCadence;
    });
  }, [recurringRules, searchTerm, minAmount, maxAmount, filterDirection, filterCadence]);

  const enabledRuleCount = filteredRules.filter((rule) => rule.enabled).length;
  const totalEnabledRecurring = filteredRules
    .filter((rule) => rule.enabled)
    .reduce((sum, rule) => sum + (rule.direction === 'credit' ? rule.amount : -rule.amount), 0);

  const resetFilters = () => {
    setMinAmount('');
    setMaxAmount('');
    setFilterDirection('all');
    setFilterCadence([]);
  };

  const isFiltered = minAmount || maxAmount || filterDirection !== 'all' || filterCadence.length > 0;

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden p-8">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Tune Rules</h1>
            <p className="text-sm text-muted-foreground mt-1">Review what FinCal thinks repeats. Disable noisy rules and adjust cadence or amount.</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Button
              variant="outline"
              className="rounded-lg bg-emerald-500/20 px-4 py-2 font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/30 hover:text-emerald-700 dark:hover:text-emerald-300"
              onClick={() => setRecurringRules((current) => current.map((rule) => ({ ...rule, enabled: true })))}
            >
              Enable all
            </Button>
            <Button
              variant="outline"
              className="rounded-lg border-border/50 bg-background/50 px-4 py-2 font-medium transition-colors hover:bg-muted text-foreground"
              onClick={() => setRecurringRules((current) => current.map((rule) => ({ ...rule, enabled: false })))}
            >
              Disable all
            </Button>
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
                  placeholder="Search rules..."
                  className="rounded-full border border-border/50 bg-background/50 pl-9 pr-4 py-1.5 text-sm outline-none w-64 focus:border-emerald-500/50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 items-center">
                {isFiltered && (
                  <Button
                    variant="ghost"
                    onClick={resetFilters}
                    className="flex h-8 items-center gap-1.5 rounded-full bg-muted/50 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" /> Clear Filters
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className={`h-8 w-8 rounded transition-colors ${isFiltered ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-500' : 'border-border/50 bg-background/50 hover:bg-muted text-muted-foreground'}`}>
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 space-y-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium leading-none">Advanced Filters</h4>
                      <p className="text-xs text-muted-foreground">Adjust range and status to find specific rules.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      {/* Amount Range */}
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Amount Range ($)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="Min"
                            value={minAmount}
                            onChange={(e) => setMinAmount(e.target.value)}
                            className="h-8 text-xs"
                          />
                          <span className="text-muted-foreground">-</span>
                          <Input
                            type="number"
                            placeholder="Max"
                            value={maxAmount}
                            onChange={(e) => setMaxAmount(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>

                      {/* Direction */}
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Type</Label>
                        <div className="flex gap-2">
                          {(['all', 'credit', 'debit'] as const).map((d: 'all' | 'credit' | 'debit') => (
                            <button
                              key={d}
                              onClick={() => setFilterDirection(d)}
                              className={`flex-1 rounded-md py-1 text-[10px] font-medium border transition-all ${filterDirection === d
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                  : 'border-border/50 hover:bg-muted text-muted-foreground'
                                }`}
                            >
                              {d === 'all' ? 'All' : d === 'credit' ? 'Income' : 'Expense'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cadence */}
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Cadence</Label>
                        <div className="grid grid-cols-2 gap-y-2">
                          {['monthly', 'weekly', 'biweekly', 'semimonthly'].map((c) => (
                            <div key={c} className="flex items-center space-x-2">
                              <Checkbox
                                id={`cadence-${c}`}
                                checked={filterCadence.includes(c)}
                                onCheckedChange={(checked) => {
                                  if (checked) setFilterCadence([...filterCadence, c]);
                                  else setFilterCadence(filterCadence.filter(f => f !== c));
                                }}
                              />
                              <Label htmlFor={`cadence-${c}`} className="text-xs font-normal capitalize">
                                {c === 'semimonthly' ? 'Semi-monthly' : c}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="overflow-auto max-h-[600px]">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="sticky top-0 bg-card z-10 text-xs uppercase tracking-widest text-muted-foreground border-b border-border/40">
                  <tr>
                    <th className="px-4 py-3 font-medium w-12 text-center">Status</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium">Direction</th>
                    <th className="px-4 py-3 font-medium">Cadence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic text-xs">
                        {isFiltered || searchTerm ? "No rules match your search or filters." : "No rules found. Import transactions first."}
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map(rule => (
                      <tr key={rule.id} className={`transition-colors hover:bg-muted/10 ${!rule.enabled ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 text-center">
                          <label className={`inline-flex items-center justify-center cursor-pointer w-10 h-5 rounded-full transition-colors ${rule.enabled ? 'bg-emerald-500/10 border-emerald-500/20 border' : 'bg-muted/50 border border-border'}`}>
                            <input type="checkbox" className="sr-only" checked={rule.enabled} onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })} />
                            <span className={`block w-3 shadow-sm h-3 rounded-full transition-transform ${rule.enabled ? 'bg-emerald-500 translate-x-1.5' : 'bg-muted-foreground -translate-x-1.5'}`} />
                          </label>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          <input
                            className="bg-transparent outline-none w-full border-b border-transparent focus:border-emerald-500/30 transition-colors"
                            value={rule.label}
                            onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-right">
                          <span className={rule.direction === 'credit' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground font-semibold'}>
                            {rule.direction === 'credit' ? '+' : '-'}{formatCurrency(rule.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">{rule.direction === 'credit' ? 'Income' : 'Expense'}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs font-medium">
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
              <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">Snapshot View</h3>

              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-tight">Rules in View</p>
                  <p className="text-2xl font-semibold mt-1">{enabledRuleCount} / {filteredRules.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-tight">Net Recurring Flow</p>
                  <p className={`text-2xl font-semibold mt-1 ${totalEnabledRecurring < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {totalEnabledRecurring < 0 ? '-' : '+'}{formatCurrency(Math.abs(totalEnabledRecurring))}
                  </p>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <p className="text-xs text-muted-foreground uppercase tracking-tight">Forecast Range</p>
                  <p className="text-xs font-medium mt-1 leading-relaxed text-foreground/80">{forecastStartDate} to <br />{forecastEndDate}</p>
                </div>
              </div>
            </div>

            {(isFiltered || searchTerm) && (
              <div className="rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase tracking-widest">Active Filters Applied</p>
                <p className="text-xs text-muted-foreground mt-2">Showing a subset of your recurring rules.</p>
                <Button variant="link" onClick={resetFilters} className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 mt-2 p-0 h-auto">Reset all</Button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}