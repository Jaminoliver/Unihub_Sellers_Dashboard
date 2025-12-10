'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Wallet, RefreshCcw, Clock, CheckCircle2 } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'refund';
  amount: number;
  status: string;
  date: string;
  description: string;
  processedAt?: string; // Ensure your DB fetch maps 'clears_at' or 'updated_at' to this
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
            const isEarning = transaction.type === 'earning'; // or 'credit'
            const isRefund = transaction.type === 'refund';
            const isWithdrawal = transaction.type === 'withdrawal'; // or 'debit'
            
            return (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* ICON BOX */}
                  <div className={`rounded-full p-2 ${
                    isEarning ? 'bg-green-100' : 
                    isRefund ? 'bg-orange-100' : 
                    'bg-red-100'
                  }`}>
                    {isEarning ? (
                      <ArrowDownLeft className="h-5 w-5 text-green-600" />
                    ) : isRefund ? (
                      <RefreshCcw className="h-5 w-5 text-orange-600" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                  
                  {/* TEXT CONTENT */}
                  <div>
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-sm text-gray-500">
                        {new Date(transaction.date).toLocaleDateString('en-NG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>

                      {/* BADGE (Now Visible for Earnings too!) */}
                      <Badge 
                        className={
                          transaction.status === 'completed' ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200' :
                          transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200' :
                          transaction.status === 'failed' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' :
                          'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }
                        variant="outline"
                      >
                        {transaction.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {transaction.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        <span className="capitalize">{transaction.status}</span>
                      </Badge>
                    </div>

                    {/* CLEARED DATE (Shows when money actually became available) */}
                    {transaction.status === 'completed' && transaction.processedAt && (
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Cleared {new Date(transaction.processedAt).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* AMOUNT */}
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    isEarning ? 'text-green-600' : 
                    isRefund ? 'text-orange-600' : 
                    'text-red-600'
                  }`}>
                    {isEarning ? '+' : '-'}₦{transaction.amount.toLocaleString('en-NG', { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  {isRefund && (
                    <p className="text-xs text-gray-400 mt-1">Refund</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}