"use client"

import { format } from "date-fns"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export interface Transaction {
  id: number
  balance: number
  amount: number
  summary: string
  when: Date
  type: "income" | "expense"
}

interface TransactionsTableProps {
  transactions: Transaction[]
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Balance</TableHead>
            <TableHead className="font-semibold">Amount</TableHead>
            <TableHead className="font-semibold">Summary</TableHead>
            <TableHead className="font-semibold text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-gray-50">
              <TableCell className="font-medium">${transaction.balance.toLocaleString()}</TableCell>
              <TableCell
                className={transaction.type === "income" ? "text-green-600 font-medium" : "text-red-600 font-medium"}
              >
                {transaction.type === "income" ? "+" : ""}${Math.abs(transaction.amount).toLocaleString()}
              </TableCell>
              <TableCell>{transaction.summary}</TableCell>
              <TableCell className="text-right">{format(transaction.when, "MM-dd-yyyy")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

