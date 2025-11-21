'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionList } from './TransactionList';
import { WithdrawalHistory } from './WithdrawalHistory';
import { Receipt, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

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

interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  status: string;
  failure_reason?: string;
  created_at: string;
  processed_at?: string;
}

interface FinanceTabsProps {
  transactions: Transaction[];
  withdrawals: Withdrawal[];
}

export function FinanceTabs({ transactions, withdrawals }: FinanceTabsProps) {
  // Filter only earnings (money IN)
  const earningsOnly = transactions.filter(t => t.type === 'earning');
  
  return (
    <Tabs defaultValue="transactions" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        <TabsTrigger value="transactions" className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          All Transactions
        </TabsTrigger>
        <TabsTrigger value="earnings" className="flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4" />
          Money In
        </TabsTrigger>
        <TabsTrigger value="withdrawals" className="flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4" />
          Withdrawals
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="transactions" className="mt-6">
        <TransactionList transactions={transactions} showEarnings={true} />
      </TabsContent>
      
      <TabsContent value="earnings" className="mt-6">
        <TransactionList transactions={earningsOnly} showEarnings={true} />
      </TabsContent>
      
      <TabsContent value="withdrawals" className="mt-6">
        <WithdrawalHistory withdrawals={withdrawals} />
      </TabsContent>
    </Tabs>
  );
}