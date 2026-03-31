import { useMemo, useEffect } from 'react';
import { useForecastContext } from '@/providers/ForecastProvider';
import { ForecastTable } from '@/components/ForecastTable';
import { ForecastCalendar } from '@/components/ForecastCalendar';
import { Search } from 'lucide-react';

export function ForecastMainContent() {
  const {
    recurringRules,
    setRecurringRules,
    generateLocalForecast,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    sortConfig, setSortConfig,
    sortedForecast,
    weekStartDay,
    warningAmount,
    warningColor,
    warningOperator,
    warningStyle
  } = useForecastContext();

  // Generate automatically if dependencies change or rules are updated
  useEffect(() => {
    generateLocalForecast();
  }, [generateLocalForecast, recurringRules]);

  const enabledRulesCount = recurringRules.filter(r => r.enabled).length;
  const netRecurringFlow = useMemo(() => {
    return recurringRules
      .filter(r => r.enabled)
      .reduce((sum, r) => sum + (r.direction === 'credit' ? r.amount : -r.amount), 0);
  }, [recurringRules]);

  const handleEnableAll = () => {
    setRecurringRules(current => current.map(r => ({ ...r, enabled: true })));
  };

  const handleDisableAll = () => {
    setRecurringRules(current => current.map(r => ({ ...r, enabled: false })));
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Top Section - Run Forecast Stats */}
      <div className="border-b border-border/40 p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Run Forecast</h2>
        
        <div className="rounded-xl border border-emerald-500/30 bg-card p-4 flex items-center justify-between shadow-sm">
          <div className="flex gap-12">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Enabled Rules</p>
              <p className="text-2xl font-semibold text-emerald-400 mt-1">{enabledRulesCount} / {recurringRules.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Net Recurring Flow</p>
              <p className={`text-2xl font-semibold mt-1 ${netRecurringFlow < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {netRecurringFlow < 0 ? '-' : '+'}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(netRecurringFlow))}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
               onClick={handleEnableAll}
               className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20 dark:hover:bg-emerald-500/30"
            >
              Enable all
            </button>
            <button
               onClick={handleDisableAll}
               className="rounded-lg border border-border/50 bg-background/50 dark:bg-muted/30 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Disable all
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Generated Forecast */}
      <div className="flex flex-1 flex-col overflow-hidden p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Generated Forecast</h2>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search"
                className="rounded-full border border-border/50 bg-background/50 pl-9 pr-4 py-1.5 text-sm outline-none w-64 focus:border-emerald-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center rounded-lg border border-border/40 bg-muted/30 p-1">
              <button
                className={`flex items-center gap-2 rounded px-3 py-1 text-sm font-medium transition-all ${
                  viewMode === 'table' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setViewMode('table')}
              >
                Table
              </button>
              <button
                className={`flex items-center gap-2 rounded px-3 py-1 text-sm font-medium transition-all ${
                  viewMode === 'calendar' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setViewMode('calendar')}
              >
                Calendar
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto rounded-xl border border-border/40 bg-card/40">
          {viewMode === 'table' ? (
            <ForecastTable
              sortedForecast={sortedForecast}
              sortConfig={sortConfig}
              handleSort={(key: any) => {
                 setSortConfig((current) => {
                   if (current.key !== key) {
                     return { key, direction: 'asc' };
                   }
                   return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
                 });
              }}
              warningAmount={warningAmount}
              warningColor={warningColor}
              warningOperator={warningOperator}
              warningStyle={warningStyle}
              enableQuickActions={false}
              onAddTransaction={() => undefined}
            />
          ) : (
            <ForecastCalendar
              forecast={sortedForecast}
              warningAmount={warningAmount}
              warningColor={warningColor}
              warningOperator={warningOperator}
              warningStyle={warningStyle}
              weekStartDay={weekStartDay}
              startDate={sortedForecast.length > 0 ? sortedForecast[0].when : new Date()}
              endDate={sortedForecast.length > 0 ? sortedForecast[sortedForecast.length - 1].when : new Date()}
              onAddTransaction={() => undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
