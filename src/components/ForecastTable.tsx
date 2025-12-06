import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { format } from 'date-fns';
import { SortAsc, SortDesc } from 'lucide-react';
import type { ForecastEntry } from '../types/calendar';

export type SortDirection = 'asc' | 'desc' | null;
export type SortKey = 'balance' | 'amount' | 'summary' | 'when' | null;
interface ForecastTableProps {
  sortedForecast: ForecastEntry[];
  handleSort: (key: SortKey) => void;
  sortConfig: {
    key: SortKey;
    direction: SortDirection;
  };
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
export function ForecastTable({ sortedForecast, handleSort, sortConfig }: ForecastTableProps) {
  return (
    <Card>
      <CardContent className="pt-6">
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
              <TableRow key={index}>
                <TableCell>{format(entry.when, 'MMM dd, yyyy')}</TableCell>
                <TableCell>{entry.summary}</TableCell>
                <TableCell className={entry.type === 'debit' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20' : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20'}>
                  {entry.type === 'debit' ? '-' : '+'}${entry.amount.toFixed(2)}
                </TableCell>
                <TableCell className={entry.balance <= 0 ? 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/20' : 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20' }>${entry.balance.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
