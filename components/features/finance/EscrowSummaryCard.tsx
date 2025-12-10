'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EscrowSummaryCardProps {
  totalAmount: number;
  orderCount: number;
}

export function EscrowSummaryCard({ totalAmount, orderCount }: EscrowSummaryCardProps) {
  const router = useRouter();
  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  if (orderCount === 0) {
    return (
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
        <CardContent className="pt-6 text-center">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No Funds in Escrow</h3>
          <p className="text-sm text-gray-600">
            Orders are automatically released 7 days after delivery
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            Funds in Escrow
          </CardTitle>
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
            {orderCount} {orderCount === 1 ? 'Order' : 'Orders'}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalAmount)}</p>
            <p className="text-sm text-gray-600 mt-1">
              Held in escrow • Auto-release in progress
            </p>
          </div>
          <Button 
            onClick={() => router.push('/dashboard/escrow')}
            className="bg-orange-600 hover:bg-orange-700"
          >
            View Details
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}