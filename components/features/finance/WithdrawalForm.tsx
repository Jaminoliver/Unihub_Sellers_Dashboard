'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { requestWithdrawal } from '@/app/dashboard/finance/actions';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Building2, CreditCard, User, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';

const initialState = { error: null, message: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Processing...' : 'Request Withdrawal'}
    </Button>
  );
}

interface WithdrawalFormProps {
  walletBalance: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export function WithdrawalForm({ walletBalance, bankName, accountNumber, accountName }: WithdrawalFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(requestWithdrawal, initialState);

  useEffect(() => {
    if (state.message) {
      toast.success(state.message);
      router.push('/dashboard/finance');
    }
    if (state.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  return (
    <form action={formAction}>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Details</CardTitle>
          <CardDescription>Funds will be sent to your verified bank account</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Available Balance */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 text-blue-900 mb-1">
              <Wallet className="h-4 w-4" />
              <span className="text-sm font-medium">Available Balance</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Withdrawal Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              placeholder="Enter amount"
              min="1000"
              max={walletBalance}
              step="0.01"
              required
            />
            <p className="text-xs text-gray-500">
              Minimum: ₦1,000 • Maximum: ₦{walletBalance.toLocaleString('en-NG')}
            </p>
          </div>

          {/* Bank Details (Read-only) */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900">Destination Account</h3>
            
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Building2 className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Bank Name</p>
                <p className="font-medium text-gray-900">{bankName}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CreditCard className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Number</p>
                <p className="font-medium text-gray-900">{accountNumber}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <User className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Account Name</p>
                <p className="font-medium text-gray-900">{accountName}</p>
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900">
              ℹ️ Withdrawals are typically processed within 24 hours. You'll receive a notification once completed.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex gap-3">
          <SubmitButton />
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}