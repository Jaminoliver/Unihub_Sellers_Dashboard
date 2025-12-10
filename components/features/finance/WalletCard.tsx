'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ArrowUpRight, AlertCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WalletCardProps {
  availableBalance: number; // Changed from 'balance'
  pendingBalance: number;   // New field
  bankVerified: boolean;
  totalEarnings?: number;
  totalWithdrawals?: number;
  pendingWithdrawals?: number;
}

export function WalletCard({ 
  availableBalance, 
  pendingBalance,
  bankVerified,
  totalEarnings = 0,
  totalWithdrawals = 0,
  pendingWithdrawals = 0
}: WalletCardProps) {
  const router = useRouter();

  // Safety check to prevent crash if data is missing
  const safeAvailable = availableBalance ?? 0;
  const safePending = pendingBalance ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Main Available Balance Card */}
      <Card className="md:col-span-2 relative overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            Available Balance
          </CardTitle>
          <CardDescription>Funds safe to withdraw</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            ₦{safeAvailable.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>

          {!bankVerified ? (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Link bank account to withdraw
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex gap-3">
              <Button 
                onClick={() => router.push('/dashboard/finance/withdraw')}
                disabled={!bankVerified || safeAvailable < 1000}
                className="w-full sm:w-auto flex items-center gap-2"
              >
                <ArrowUpRight className="h-4 w-4" />
                Withdraw
              </Button>
            </div>
          )}

          {safeAvailable < 1000 && safeAvailable > 0 && (
            <p className="text-xs text-muted-foreground">
              Minimum withdrawal: ₦1,000
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pending Balance Card (The Escrow Timer) */}
      <Card className="bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Clearance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
            ₦{safePending.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-1">
            Available 48h after delivery
          </p>
        </CardContent>
      </Card>

      {/* Stats Column */}
      <div className="flex flex-col gap-4">
        {/* Total Earnings */}
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total Earnings
            </div>
            <div className="text-xl font-bold">
              ₦{totalEarnings.toLocaleString('en-NG', { compactDisplay: 'short' })}
            </div>
          </CardContent>
        </Card>

        {/* Total Withdrawn */}
        <Card className="flex-1">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Withdrawn
            </div>
            <div className="text-xl font-bold">
              ₦{totalWithdrawals.toLocaleString('en-NG', { compactDisplay: 'short' })}
            </div>
            {pendingWithdrawals > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                +₦{pendingWithdrawals.toLocaleString()} processing
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}