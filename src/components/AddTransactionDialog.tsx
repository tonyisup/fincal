import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Calendar as GoogleCalendar } from "../types/calendar";

interface AddTransactionDialogProps {
  calendars?: GoogleCalendar[];
  selectedCreditCalendarId: string | undefined;
  selectedDebitCalendarId: string | undefined;
  accessToken: string | null;
  onTransactionAdded: () => void;
  handleLogout: () => void;
  hasWriteAccess: boolean;
  grantWriteAccess: () => Promise<boolean>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultType?: 'credit' | 'debit';
}

type Frequency = "ONCE" | "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "YEARLY";

export function AddTransactionDialog({
  selectedCreditCalendarId,
  selectedDebitCalendarId,
  accessToken,
  onTransactionAdded,
  handleLogout,
  hasWriteAccess,
  grantWriteAccess,
  open,
  onOpenChange,
  defaultDate = new Date(),
  defaultType = 'debit'
}: Omit<AddTransactionDialogProps, 'calendars'>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"credit" | "debit">(defaultType);
  const [frequency, setFrequency] = useState<Frequency>("ONCE");
  const [date, setDate] = useState<Date | undefined>(defaultDate);

  // Custom recurrence options
  const [recurrenceCount, setRecurrenceCount] = useState("");
  const [recurrenceUntil, setRecurrenceUntil] = useState<Date | undefined>();

  // Date picker state
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isRecurrenceDateOpen, setIsRecurrenceDateOpen] = useState(false);

  // Reset/Initialize form when dialog opens
  useEffect(() => {
    if (open) {
      if (defaultDate) setDate(defaultDate);
      if (defaultType) setType(defaultType);
      // Don't reset other fields if we want to persist? 
      // Usually opening a new dialog means new transaction, so safe to reset others.
      setDescription("");
      setAmount("");
      setFrequency("ONCE");
      setRecurrenceCount("");
      setRecurrenceUntil(undefined);
      setError(null);
    }
  }, [open, defaultDate, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;

    if (!hasWriteAccess) {
      const granted = await grantWriteAccess();
      if (!granted) return; // User denied or failed
    }

    if (!description || !amount || !date) {
      setError("Please fill in all required fields.");
      return;
    }

    const calendarId = type === "credit" ? selectedCreditCalendarId : selectedDebitCalendarId;
    if (!calendarId) {
      setError(`Please select a ${type === "credit" ? "income" : "expense"} calendar in the main settings first.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Format: $Amount Description
      const summary = `$${amount} ${description}`;

      const eventDate = format(date, "yyyy-MM-dd");

      let recurrence: string[] | undefined = undefined;

      if (frequency !== "ONCE") {
        let rrule = `RRULE:FREQ=${frequency === "BIWEEKLY" ? "WEEKLY;INTERVAL=2" : frequency}`;

        if (recurrenceUntil) {
          // RRULE UNTIL must be in UTC YYYYMMDDTHHMMSSZ format
          const untilStr = format(recurrenceUntil, "yyyyMMdd");
          rrule += `;UNTIL=${untilStr}T235959Z`;
        } else if (recurrenceCount) {
          rrule += `;COUNT=${recurrenceCount}`;
        }

        recurrence = [rrule];
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            summary,
            start: { date: eventDate },
            end: { date: eventDate },
            recurrence,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.error?.message || response.statusText,
          status: response.status,
        };
      }

      onOpenChange(false);
      // We don't reset form here because useEffect will do it on next open
      // but cleaning up is good practice if we didn't have the effect.
      onTransactionAdded();
    } catch (err: any) {
      console.error("Error creating transaction:", err);
      setError(`Failed to create transaction: ${err.message}`);
      if (err.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Create a new income or expense transaction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-red-100 text-red-700 text-sm p-3 rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select value={type} onValueChange={(v: "credit" | "debit") => setType(v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="credit">Income</SelectItem>
                <SelectItem value="debit">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              Amount
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="e.g. Rent, Salary"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Date</Label>
            <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setIsDateOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="frequency" className="text-right">
              Frequency
            </Label>
            <Select value={frequency} onValueChange={(v: Frequency) => setFrequency(v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONCE">One-time</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {frequency !== "ONCE" && (
            <div className="space-y-4 border-t pt-4 mt-2">
              <div className="text-sm font-medium text-center text-muted-foreground">Recurrence Settings (Optional)</div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="count" className="text-right">Times</Label>
                <Input
                  id="count"
                  type="number"
                  placeholder="Forever"
                  value={recurrenceCount}
                  onChange={(e) => {
                    setRecurrenceCount(e.target.value);
                    if (e.target.value) setRecurrenceUntil(undefined);
                  }}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Until</Label>
                <Popover open={isRecurrenceDateOpen} onOpenChange={setIsRecurrenceDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "col-span-3 justify-start text-left font-normal",
                        !recurrenceUntil && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {recurrenceUntil ? format(recurrenceUntil, "PPP") : <span>Forever</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={recurrenceUntil}
                      onSelect={(d) => {
                        setRecurrenceUntil(d);
                        if (d) setRecurrenceCount("");
                        setIsRecurrenceDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Transaction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
