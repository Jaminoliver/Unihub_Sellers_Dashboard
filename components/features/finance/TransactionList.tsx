'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal';
  amount: number;
  status: string;
  date: string;
  description: string;
  processedAt?: string;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  showEarnings?: boolean;
}

export function TransactionList({ transactions, showEarnings = false }: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>All your earnings and withdrawals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No transactions yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>All your earnings and withdrawals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const isEarning = transaction.type === 'earning';
            
            return (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-full p-2 ${
                    isEarning ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {isEarning ? (
                      <ArrowDownLeft className="h-5 w-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('en-NG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {!isEarning && (
                        <Badge 
                          variant={
                            transaction.status === 'completed' ? 'default' :
                            transaction.status === 'pending' ? 'secondary' :
                            transaction.status === 'failed' ? 'destructive' :
                            'secondary'
                          }
                        >
                          {transaction.status}
                        </Badge>
                      )}
                    </div>
                    {!isEarning && transaction.status === 'completed' && transaction.processedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Processed {new Date(transaction.processedAt).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    isEarning ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isEarning ? '+' : '-'}₦{transaction.amount.toLocaleString('en-NG', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}