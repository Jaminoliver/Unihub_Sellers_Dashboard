'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Clock, CheckCircle2, XCircle, AlertCircle, ArrowUpRight, Wallet } from 'lucide-react';
import { cancelWithdrawal } from '@/app/dashboard/finance/actions';
import { toast } from 'sonner';
import { useTransition } from 'react';

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

interface WithdrawalHistoryProps {
  withdrawals: Withdrawal[];
}

export function WithdrawalHistory({ withdrawals }: WithdrawalHistoryProps) {
  const [isPending, startTransition] = useTransition();

  const handleCancel = (id: string) => {
    if (!confirm('Are you sure you want to cancel this withdrawal? The amount will be returned to your wallet.')) {
      return;
    }
    
    startTransition(async () => {
      const result = await cancelWithdrawal(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  if (withdrawals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No withdrawal requests yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal History</CardTitle>
        <CardDescription>Track your withdrawal requests and their status</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => (
            <div 
              key={withdrawal.id} 
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="rounded-full bg-red-100 p-2">
                  <ArrowUpRight className="h-5 w-5 text-red-600" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">Withdrawal to {withdrawal.bank_name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {withdrawal.account_number}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-gray-400">
                      {new Date(withdrawal.created_at).toLocaleDateString('en-NG', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <Badge 
                      variant={
                        withdrawal.status === 'completed' ? 'default' :
                        withdrawal.status === 'pending' ? 'secondary' :
                        withdrawal.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                      className="flex items-center gap-1"
                    >
                      {getStatusIcon(withdrawal.status)}
                      {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
                    </Badge>
                  </div>
                  {withdrawal.failure_reason && (
                    <p className="text-xs text-red-600 mt-1 bg-red-50 p-2 rounded">
                      {withdrawal.failure_reason}
                    </p>
                  )}
                  {withdrawal.status === 'completed' && withdrawal.processed_at && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Processed {new Date(withdrawal.processed_at).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">
                   -₦{Number(withdrawal.amount).toLocaleString('en-NG', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                </div>

                {withdrawal.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(withdrawal.id)}
                    disabled={isPending}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}