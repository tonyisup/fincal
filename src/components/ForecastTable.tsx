import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import { SortAsc, SortDesc, Plus, Minus, Edit, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { ForecastEntry } from '../types/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { ButtonGroup } from './ui/button-group';
import type { WarningStyle } from "./ForecastCalendar";
import { cn } from "@/lib/utils";

export type SortDirection = 'asc' | 'desc' | null;
export type SortKey = 'balance' | 'amount' | 'summary' | 'when' | null;
interface ForecastTableProps {
  sortedForecast: ForecastEntry[];
  handleSort: (key: SortKey) => void;
  sortConfig: {
    key: SortKey;
    direction: SortDirection;
  };
  onAddTransaction: (date: Date, type: 'credit' | 'debit') => void;
  warningAmount: number;
  warningColor: string;
  warningOperator: '<' | '<=';
  warningStyle: WarningStyle;
  onOpenExternalDate?: (date: Date) => void;
  enableQuickActions?: boolean;
}

function SortDirectionIcon({ direction }: { direction: SortDirection }) {
  if (direction === 'desc') {
    return <SortDesc className="w-4 h-4 shrink-0" aria-hidden />;
  } else if (direction === 'asc') {
    return <SortAsc className="w-4 h-4 shrink-0" aria-hidden />;
  } else {
    return null;
  }
}

function ariaSortFor(
  column: Exclude<SortKey, null>,
  sortConfig: ForecastTableProps['sortConfig'],
): 'ascending' | 'descending' | 'none' {
  if (sortConfig.key !== column) return 'none';
  if (sortConfig.direction === 'asc') return 'ascending';
  if (sortConfig.direction === 'desc') return 'descending';
  return 'none';
}
export function ForecastTable({
  sortedForecast,
  handleSort,
  sortConfig,
  onAddTransaction,
  warningAmount,
  warningColor,
  warningOperator,
  warningStyle,
  onOpenExternalDate,
  enableQuickActions = true,
}: ForecastTableProps) {
  // colors helper from calendar
  const colors = {
    green: '#86efac',
    red: '#f87171',
  };

  return (
    <Card className="overflow-hidden border-0 bg-transparent shadow-none">
      <CardContent className="p-0">
        <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/90 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Forecast Table</p>
              <p className="text-sm text-muted-foreground">Scan every projected balance change in chronological order.</p>
            </div>
            <div className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
              {sortedForecast.length} rows
            </div>
          </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-background/90">
              <TableHead aria-sort={ariaSortFor('when', sortConfig)} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort('when')}
                  className="inline-flex w-full cursor-pointer items-center gap-2 rounded-sm text-left font-medium outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>When</span>
                  {sortConfig.key === 'when' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                  {sortConfig.key === null || sortConfig.direction === null ? (
                    <SortDirectionIcon direction="asc" />
                  ) : null}
                </button>
              </TableHead>
              <TableHead aria-sort={ariaSortFor('summary', sortConfig)} className="py-3">
                <button
                  type="button"
                  onClick={() => handleSort('summary')}
                  className="inline-flex w-full cursor-pointer items-center gap-2 rounded-sm text-left font-medium outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>Summary</span>
                  {sortConfig.key === 'summary' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </button>
              </TableHead>
              <TableHead aria-sort={ariaSortFor('amount', sortConfig)} className="py-3">
                <button
                  type="button"
                  onClick={() => handleSort('amount')}
                  className="inline-flex w-full cursor-pointer items-center gap-2 rounded-sm text-left font-medium outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>Amount</span>
                  {sortConfig.key === 'amount' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </button>
              </TableHead>
              <TableHead aria-sort={ariaSortFor('balance', sortConfig)} className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleSort('balance')}
                  className="inline-flex w-full cursor-pointer items-center gap-2 rounded-sm text-left font-medium outline-none select-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>Balance</span>
                  {sortConfig.key === 'balance' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedForecast.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Generate a forecast to populate the table.
                </TableCell>
              </TableRow>
            )}
            {sortedForecast.map((entry) => {
              const isWarning = warningOperator === '<' ? entry.balance < warningAmount : entry.balance <= warningAmount;
              const rowStyle = isWarning ? {
                backgroundColor: warningStyle === 'Row Background' ? warningColor : undefined,
                color: warningStyle === 'Text Color' ? warningColor : undefined,
              } : undefined;
              const rowKey = `${format(entry.when, 'yyyy-MM-dd')}-${entry.summary}-${entry.amount}-${entry.balance}-${entry.type}`;
              const rowDomId = `forecast-row-${rowKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

              return (
                <TableRow
                  key={rowKey}
                  id={rowDomId}
                  style={rowStyle}
                  className={cn(
                    'border-border/60 transition-colors hover:bg-muted/30',
                    entry.type === 'initial' && 'bg-muted/25',
                  )}
                >
                  <TableCell
                    className="relative group px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{format(entry.when, 'MMM dd, yyyy')}</div>
                        <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                          {format(entry.when, 'EEEE')}
                        </div>
                      </div>
                      {enableQuickActions && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              className="opacity-0 group-hover:opacity-100"
                              size="icon"
                              variant="ghost"
                              aria-label="Edit forecast"
                            >
                              <Edit />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent side="left">
                            <ButtonGroup className="bg-background">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddTransaction(entry.when, 'credit');
                                }}
                                variant="ghost"
                                size="icon"
                                title="Add Income"
                                aria-label="Add income"
                                style={{ color: colors.green }}
                              >
                                <Plus />
                              </Button>
                              {onOpenExternalDate && (
                                <Button
                                  onClick={() => onOpenExternalDate(entry.when)}
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Open external date"
                                  title="Open external date"
                                >
                                  <ExternalLink />
                                </Button>
                              )}
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddTransaction(entry.when, 'debit');
                                }}
                                variant="ghost"
                                size="icon"
                                title="Add Expense"
                                aria-label="Add expense"
                                style={{ color: colors.red }}
                              >
                                <Minus />
                              </Button>
                            </ButtonGroup>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.24em]',
                          entry.type === 'credit' && 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
                          entry.type === 'debit' && 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
                          entry.type === 'initial' && 'bg-slate-200 text-slate-700 dark:bg-slate-500/15 dark:text-slate-200',
                        )}
                      >
                        {entry.type}
                      </span>
                      <span className="font-medium">{entry.summary}</span>
                    </div>
                  </TableCell>
                  <TableCell className={entry.type === 'debit' ? 'py-3 text-right text-red-700 dark:text-red-300' : 'py-3 text-right text-green-800 dark:text-green-200'}>
                    {entry.type === 'debit' ? '-' : '+'}${entry.amount.toFixed(2)}
                  </TableCell>
                  <TableCell style={{ color: warningStyle === 'Balance Color' && entry.balance <= warningAmount ? warningColor : undefined }} className={cn(
                    entry.balance <= 0 ? 'px-4 py-3 text-right text-red-600 dark:text-red-400' : 'px-4 py-3 text-right',
                  )}>${entry.balance.toFixed(2)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card >
  );
}