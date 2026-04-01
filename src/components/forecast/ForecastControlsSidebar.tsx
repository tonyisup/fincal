import { useState } from 'react';
import { useForecastContext } from '@/providers/ForecastProvider';

import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';

export function ForecastControlsSidebar() {
  const {
    forecastStartDate,
    forecastEndDate,
    currentBalance, setCurrentBalance,
    timespan, setTimespan,
    weekStartDay, setWeekStartDay,
    warningAmount, setWarningAmount,
    warningColor, setWarningColor,
    warningOperator, setWarningOperator,
    warningStyle, setWarningStyle,
    manualDescription, setManualDescription,
    manualAmount, setManualAmount,
    manualDate, setManualDate,
    addManualAdjustment,
    oneOffTransactions,
    error,
    successMessage
  } = useForecastContext();

  const [controlsExpanded, setControlsExpanded] = useState(true);
  const [warningBehaviorExpanded, setWarningBehaviorExpanded] = useState(true);
  const [adjustmentsExpanded, setAdjustmentsExpanded] = useState(true);

  const oneOffNetTotal = oneOffTransactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="flex h-full w-[340px] flex-col overflow-y-auto border-r border-border/40 bg-card/60 px-4 py-5 shadow-sm scrollbar-hide">

      {/* Forecast Controls Collapse Panel Header */}
      <button
        className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground bg-transparent border-none appearance-none"
        onClick={() => setControlsExpanded(!controlsExpanded)}
        aria-expanded={controlsExpanded}
        aria-controls="forecast-controls-panel"
      >
        <span>Forecast Controls</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${controlsExpanded ? 'rotate-0' : '-rotate-90'}`} />
      </button>

      <div id="forecast-controls-panel" className={`space-y-5 transition-all duration-300 ease-in-out overflow-hidden ${controlsExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>

        {/* Dates */}
        <div className="pt-4 space-y-3">
          <label className="space-y-1.5 text-sm font-medium">
            <span className="text-muted-foreground text-xs">Forecast Starts</span>
            <div className="flex items-center rounded-lg border bg-background/50 px-3 py-2.5">
              <span>{forecastStartDate}</span>
              <CalendarIcon className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          </label>

          <label className="space-y-1.5 text-sm font-medium">
            <span className="text-muted-foreground text-xs">Forecast Ends</span>
            <div className="flex items-center rounded-lg border bg-background/50 px-3 py-2.5">
              <span>{forecastEndDate}</span>
              <CalendarIcon className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          </label>
        </div>

        <hr className="border-border/40" />

        {/* Balance Baseline & Horizon */}
        <div className="space-y-4">
          <label className="space-y-1.5 text-sm font-medium">
            <span className="text-muted-foreground text-xs">Balance Baseline</span>
            <div className="flex items-center rounded-lg border bg-background/50">
              <span className="border-r px-3 py-2 text-xs text-muted-foreground">Current Balance</span>
              <input
                type="number"
                className="w-full bg-transparent px-3 py-2 text-right outline-none"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
              />
            </div>
          </label>

          <label className="space-y-1.5 text-sm font-medium flex-col flex">
            <span className="text-muted-foreground text-xs">Forecast Horizon</span>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border bg-background/50 px-3 py-2.5 outline-none"
                value={timespan}
                onChange={(e) => setTimespan(e.target.value)}
              >
                <option value="30D">30 days</option>
                <option value="60D">60 days</option>
                <option value="90D">90 days</option>
                <option value="180D">180 days</option>
                <option value="1Y">1 year</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>

          <label className="space-y-1.5 text-sm font-medium flex flex-col">
            <span className="text-muted-foreground text-xs">Week Starts On</span>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border bg-background/50 px-3 py-2.5 outline-none"
                value={weekStartDay}
                onChange={(e) => setWeekStartDay(Number(e.target.value) as 0 | 1)}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
        </div>
      </div>

      <hr className="my-4 border-border/40" />

      {/* Warnings Behavior Controls Collapse Panel Header */}
      <button
        className="flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground bg-transparent border-none appearance-none"
        onClick={() => setWarningBehaviorExpanded(!warningBehaviorExpanded)}
        aria-expanded={warningBehaviorExpanded}
        aria-controls="warnings-behavior-panel"
      >
        <span>Warnings Behavior</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${warningBehaviorExpanded ? 'rotate-0' : '-rotate-90'}`} />
      </button>

      <div id="warnings-behavior-panel" className={`space-y-5 transition-all duration-300 ease-in-out overflow-hidden ${warningBehaviorExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {/* Warning Behavior */}
        <div className="pt-4 space-y-4">
          <label className="space-y-1.5 text-sm font-medium flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Warning amount</span>
            <input
              type="number"
              className="w-24 rounded-lg border bg-background/50 px-2 py-1 text-right outline-none"
              value={warningAmount}
              onChange={(e) => setWarningAmount(Number(e.target.value))}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Warning color</span>
            <input
              type="color"
              className="w-24 h-8 cursor-pointer rounded border bg-transparent p-0 outline-none"
              value={warningColor}
              onChange={(e) => setWarningColor(e.target.value)}
            />
          </label>
          <label className="space-y-1.5 text-sm font-medium flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Warning condition</span>
            <select
              className="w-[120px] rounded border bg-background/50 px-2 py-1 outline-none text-xs"
              value={warningOperator}
              onChange={(e) => setWarningOperator(e.target.value as '<' | '<=')}
            >
              <option value="<">Balance below thr...</option>
              <option value="<=">Balance at/below thr...</option>
            </select>
          </label>
          <label className="space-y-1.5 text-sm font-medium flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Highlight style</span>
            <select
              className="w-[120px] rounded border bg-background/50 px-2 py-1 outline-none text-xs"
              value={warningStyle}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const value = e.target.value as 'Text Color' | 'Row Background' | 'Balance Color';
                setWarningStyle(value);
              }}
            >
              <option value="Text Color">Text Color</option>
              <option value="Row Background">Row Background</option>
              <option value="Balance Color">Balance Color</option>
            </select>
          </label>
        </div>

      </div>

      <hr className="my-4 border-border/40" />

      <div>
        <button
          className="mb-4 flex w-full cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground bg-transparent border-none appearance-none"
          onClick={() => setAdjustmentsExpanded(!adjustmentsExpanded)}
          aria-expanded={adjustmentsExpanded}
          aria-controls="manual-adjustments-panel"
        >
          <span>Manual Adjustments</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${adjustmentsExpanded ? 'rotate-0' : '-rotate-90'}`} />
        </button>

        <div id="manual-adjustments-panel" className={`space-y-4 transition-all duration-300 ease-in-out overflow-hidden ${adjustmentsExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Net Adjustments</span>
            <span className={oneOffNetTotal < 0 ? 'text-red-500 font-medium' : oneOffNetTotal > 0 ? 'text-emerald-500 font-medium' : 'text-foreground font-medium'}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(oneOffNetTotal)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Latest Planned Date</span>
            <span className="font-medium">
              {(() => {
                if (oneOffTransactions.length === 0) return 'None yet';
                const latestDate = oneOffTransactions.reduce((latest, tx) => {
                  const txDate = new Date(tx.date);
                  return txDate > latest ? txDate : latest;
                }, new Date(oneOffTransactions[0].date));
                return format(latestDate, 'MMM d, yyyy');
              })()}
            </span>
          </div>

          <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-background/30 p-4">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Create a one-off adjustment</div>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground mb-1 block">Description</span>
              <input
                type="text"
                placeholder="Positive Income"
                className="w-full rounded-lg border bg-background/50 px-3 py-2 outline-none"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground mb-1 block">Amount</span>
              <input
                type="number"
                placeholder="e.g. 500"
                className="w-full rounded-lg border bg-background/50 px-3 py-2 outline-none"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="text-xs text-muted-foreground mb-1 block">Date</span>
              <div className="flex w-full items-center rounded-lg border bg-background/50 px-3 py-2">
                <input
                  type="date"
                  className="w-full bg-transparent outline-none"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                />
              </div>
            </label>
            <Button
              className="mt-2 w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-600 transition-colors rounded-lg font-semibold"
              onClick={addManualAdjustment}
            >
              Add Planned Adjustment
            </Button>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            {successMessage && <p className="text-xs text-emerald-500 mt-2">{successMessage}</p>}
          </div>
        </div>
      </div>

    </div>
  );
}