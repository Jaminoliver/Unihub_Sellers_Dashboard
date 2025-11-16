'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WalletCardProps {
  balance: number;
  bankVerified: boolean;
}

export function WalletCard({ balance, bankVerified }: WalletCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Balance
        </CardTitle>
        <CardDescription>Available funds for withdrawal</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-4xl font-bold text-gray-900">
          ₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>

        {!bankVerified && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please verify your bank account to withdraw funds
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={() => router.push('/dashboard/finance/withdraw')}
            disabled={!bankVerified || balance < 1000}
            className="flex items-center gap-2"
          >
            <ArrowUpRight className="h-4 w-4" />
            Withdraw Funds
          </Button>
          
          {!bankVerified && (
            <Button 
              variant="outline"
              onClick={() => router.push('/dashboard/account/verification')}
            >
              Verify Bank Account
            </Button>
          )}
        </div>

        {balance < 1000 && balance > 0 && (
          <p className="text-sm text-gray-500">
            Minimum withdrawal amount is ₦1,000
          </p>
        )}
      </CardContent>
    </Card>
  );
}