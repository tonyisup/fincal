import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import { SortAsc, SortDesc, Plus, Minus, Edit, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import type { ForecastEntry } from '../types/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { ButtonGroup } from './ui/button-group';

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
export function ForecastTable({ sortedForecast, handleSort, sortConfig, onAddTransaction }: ForecastTableProps) {
  // colors helper from calendar
  const colors = {
    green: '#86efac',
    red: '#f87171',
  };

  const onEditDay = (date: Date) => {
    window.open(`https://calendar.google.com/calendar/u/0/r/day/${format(date, 'yyyy')}/${format(date, 'MM')}/${format(date, 'dd')}`, '_blank');
  };

  return (
    <Card>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => handleSort('when')} className="cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  When
                  {sortConfig.key === 'when' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                  {(sortConfig.key === null || sortConfig.direction === null) ? <SortDirectionIcon direction="asc" /> : null}
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort('summary')} className="cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  Summary
                  {sortConfig.key === 'summary' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort('amount')} className="cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  Amount
                  {sortConfig.key === 'amount' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </div>
              </TableHead>
              <TableHead onClick={() => handleSort('balance')} className="cursor-pointer select-none">
                <div className="flex items-center gap-2">
                  Balance
                  {sortConfig.key === 'balance' ? <SortDirectionIcon direction={sortConfig.direction} /> : null}
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedForecast.map((entry, index) => (
              <TableRow key={index} id={`row-${index}`}>
                <TableCell
                  className="relative group"
                >
                  <div className="flex items-center gap-2">
                    {format(entry.when, 'MMM dd, yyyy')}
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
                            onClick={() => onEditDay(entry.when)}
                            size="icon"
                          >
                            <ExternalLink />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTransaction(entry.when, 'credit');
                            }}
                            size="icon"
                            title="Add Income"
                            style={{ color: colors.green }}
                          >
                            <Plus />
                          </Button>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddTransaction(entry.when, 'debit');
                            }}
                            size="icon"
                            title="Add Expense"
                            style={{ color: colors.red }}
                          >
                            <Minus />
                          </Button>
                        </ButtonGroup>
                      </PopoverContent>
                    </Popover>
                  </div>
                </TableCell>
                <TableCell>{entry.summary}</TableCell>
                <TableCell className={entry.type === 'debit' ? 'text-right text-red-700 dark:text-red-300' : 'text-right text-green-800 dark:text-green-200'}>
                  {entry.type === 'debit' ? '-' : '+'}${entry.amount.toFixed(2)}
                </TableCell>
                <TableCell className={entry.balance <= 0 ? 'text-right text-red-600 dark:text-red-400' : 'text-right'}>${entry.balance.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card >
  );
}
