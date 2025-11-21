'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WalletCardProps {
  balance: number;
  bankVerified: boolean;
  totalEarnings?: number;
  totalWithdrawals?: number;
  pendingWithdrawals?: number;
}

export function WalletCard({ 
  balance, 
  bankVerified,
  totalEarnings = 0,
  totalWithdrawals = 0,
  pendingWithdrawals = 0
}: WalletCardProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Main Balance Card */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Available Balance
          </CardTitle>
          <CardDescription>Funds available for withdrawal</CardDescription>
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

      {/* Total Earnings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            Total Earnings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            ₦{totalEarnings.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-gray-500 mt-1">From completed orders</p>
        </CardContent>
      </Card>

      {/* Total Withdrawn Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            Total Withdrawn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            ₦{totalWithdrawals.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          {pendingWithdrawals > 0 && (
            <p className="text-xs text-orange-600 mt-1">
              ₦{pendingWithdrawals.toLocaleString('en-NG')} pending
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}