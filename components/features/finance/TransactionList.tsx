'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Minus } from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  reference: string;
  status: string;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your wallet transaction history</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your wallet transaction history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const isCredit = transaction.transaction_type === 'credit';
            const isWithdrawal = transaction.transaction_type === 'withdrawal';
            const isCommission = transaction.transaction_type === 'commission';
            
            return (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${
                    isCredit ? 'bg-green-100' : 
                    isWithdrawal ? 'bg-red-100' : 
                    'bg-gray-100'
                  }`}>
                    {isCredit && <ArrowDownLeft className="h-4 w-4 text-green-600" />}
                    {isWithdrawal && <ArrowUpRight className="h-4 w-4 text-red-600" />}
                    {isCommission && <Minus className="h-4 w-4 text-gray-600" />}
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.created_at).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {transaction.reference && (
                      <p className="text-xs text-gray-400 mt-1">{transaction.reference}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-bold ${
                    isCredit ? 'text-green-600' : 
                    isWithdrawal ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {isCredit ? '+' : ''}{isWithdrawal || isCommission ? '-' : ''}₦{Math.abs(transaction.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500">
                    Balance: ₦{transaction.balance_after.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                  <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="mt-1">
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}