"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CalendarIcon, DollarSign } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { TransactionsTable, type Transaction } from "@/components/transactions-table"

export function Forecast() {
  const [date, setDate] = useState<Date>(new Date(2025, 4, 31))
  const [currentBalance, setCurrentBalance] = useState(4000)
  const [creditAccount, setCreditAccount] = useState("Income")
  const [debitAccount, setDebitAccount] = useState("Bills")

  // Sample transaction data based on the screenshot
  const transactions: Transaction[] = [
    {
      id: 1,
      balance: 4000,
      amount: -100,
      summary: "$100 CareCredit Layne",
      when: new Date(2025, 3, 3),
      type: "expense",
    },
    { id: 2, balance: 3900, amount: -750, summary: "$750 Travel Card", when: new Date(2025, 3, 4), type: "expense" },
    { id: 3, balance: 3150, amount: -250, summary: "$250 SDGE", when: new Date(2025, 3, 10), type: "expense" },
    { id: 4, balance: 2900, amount: 2985, summary: "$2985 AP Tony", when: new Date(2025, 3, 11), type: "income" },
    { id: 5, balance: 5885, amount: 1500, summary: "$1500 NU Layne", when: new Date(2025, 3, 11), type: "income" },
    { id: 6, balance: 7385, amount: -750, summary: "$750 Travel Card", when: new Date(2025, 3, 11), type: "expense" },
    { id: 7, balance: 6635, amount: -400, summary: "$400 BofA Auto", when: new Date(2025, 3, 15), type: "expense" },
    {
      id: 8,
      balance: 6235,
      amount: -650,
      summary: "$650 Citi Layne Lost Lands",
      when: new Date(2025, 3, 15),
      type: "expense",
    },
    {
      id: 9,
      balance: 5585,
      amount: -285,
      summary: "$285 CareCredit Tony",
      when: new Date(2025, 3, 15),
      type: "expense",
    },
  ]

  const runForecast = () => {
    // In a real app, this would calculate the forecast based on inputs
    console.log("Running forecast with end date:", date)
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Financial Forecast</CardTitle>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-6 w-6 text-emerald-600" />
              <span className="text-lg font-medium">CashFlow Forecast</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Select a credit account
              </label>
              <Select value={creditAccount} onValueChange={setCreditAccount}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Investments">Investments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Select a debit account
              </label>
              <Select value={debitAccount} onValueChange={setDebitAccount}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bills">Bills</SelectItem>
                  <SelectItem value="Credit Cards">Credit Cards</SelectItem>
                  <SelectItem value="Loans">Loans</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Current balance
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">$</span>
                <input
                  type="number"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-8 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Forecast end date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal sm:w-[240px]",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "MM/dd/yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={(date) => date && setDate(date)} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="outline" onClick={runForecast}>
              Run Forecast
            </Button>
          </div>

          <div className="mt-8">
            <TransactionsTable transactions={transactions} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

