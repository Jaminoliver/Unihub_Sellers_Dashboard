'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
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
    startTransition(async () => {
      const result = await cancelWithdrawal(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(result.message);
      }
    });
  };

  if (withdrawals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No withdrawal requests yet</p>
        </CardContent>
      </Card>
    );
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'processing':
        return 'default';
      case 'cancelled':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Withdrawal History</CardTitle>
        <CardDescription>Your recent withdrawal requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                
                <div>
                  <p className="font-medium text-gray-900">
                    ₦{withdrawal.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500">
                    {withdrawal.bank_name} • {withdrawal.account_number}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(withdrawal.created_at).toLocaleDateString('en-NG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  {withdrawal.failure_reason && (
                    <p className="text-xs text-red-600 mt-1">{withdrawal.failure_reason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={getStatusColor(withdrawal.status)} className="flex items-center gap-1">
                  {getStatusIcon(withdrawal.status)}
                  {withdrawal.status}
                </Badge>

                {withdrawal.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(withdrawal.id)}
                    disabled={isPending}
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