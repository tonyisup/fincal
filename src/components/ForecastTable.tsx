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
    return <SortDesc className="w-4 h-4" />;
  } else if (direction === 'asc') {
    return <SortAsc className="w-4 h-4" />;
  } else {
    return null;
  }
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
              <TableHead onClick={() => handleSort('when')} className="cursor-pointer select-none px-4 py-3">
                <div className="flex items-center gap-2">
                  When
                  {sortConfig.key === 'when' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                  {(sortConfig.key === null || sortConfig.direction === null) ? <SortDirectionIcon direction="asc" /> : null}
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort('summary')} className="cursor-pointer select-none py-3">
                <div className="flex items-center gap-2">
                  Summary
                  {sortConfig.key === 'summary' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort('amount')} className="cursor-pointer select-none py-3">
                <div className="flex items-center gap-2">
                  Amount
                  {sortConfig.key === 'amount' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort('balance')} className="cursor-pointer select-none px-4 py-3">
                <div className="flex items-center gap-2">
                  Balance
                  {sortConfig.key === 'balance' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </div>
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
            {sortedForecast.map((entry, index) => {
              const isWarning = warningOperator === '<' ? entry.balance < warningAmount : entry.balance <= warningAmount;
              const rowStyle = isWarning ? {
                backgroundColor: warningStyle === 'Row Background' ? warningColor : undefined,
                color: warningStyle === 'Text Color' ? warningColor : undefined,
              } : undefined;
              const uniqueId = `${format(entry.when, 'yyyy-MM-dd')}-${entry.summary}-${entry.amount}-${index}`;

              return (
                <TableRow
                  key={uniqueId}
                  id={`row-${uniqueId}`}
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