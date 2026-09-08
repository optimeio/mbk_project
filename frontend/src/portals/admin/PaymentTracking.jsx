"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PaymentTracking = () => {
  const [payments] = useState([
    {
      id: 1,
      trainer: "Jane Smith",
      amount: 26400,
      date: "2023-11-05",
      method: "Bank Transfer",
      transactionId: "TXN123456789",
      status: "Completed",
    },
    {
      id: 2,
      trainer: "John Doe",
      amount: 20000,
      date: "2023-10-05",
      method: "UPI",
      transactionId: "UPI987654321",
      status: "Completed",
    },
  ]);

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <Card className="mt-2 border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-xl text-gray-900">Payment Tracking</CardTitle>
          <p className="text-sm text-gray-700">
            History of all payments made to trainers.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="py-3.5 pl-4 pr-3 sm:pl-6">Trainer Name</TableHead>
                  <TableHead className="px-3 py-3.5">Amount</TableHead>
                  <TableHead className="px-3 py-3.5">Date</TableHead>
                  <TableHead className="px-3 py-3.5">Method</TableHead>
                  <TableHead className="px-3 py-3.5">Transaction ID</TableHead>
                  <TableHead className="px-3 py-3.5">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="bg-white">
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="whitespace-nowrap py-4 pl-4 pr-3 font-medium text-gray-900 sm:pl-6">
                      {payment.trainer}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 font-semibold text-gray-900">
                      Rs {payment.amount}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-gray-600">
                      {payment.date}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-gray-600">
                      {payment.method}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4 text-gray-600">
                      {payment.transactionId}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-3 py-4">
                      <Badge className="rounded-full bg-green-100 px-2 text-xs font-semibold text-green-800">
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentTracking;

