'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Package, Calendar, User, Mail } from 'lucide-react';

interface EscrowTransaction {
  id: string;
  order_id: string;
  amount: number;
  status: 'holding' | 'released' | 'refunded';
  hold_until: string;
  released_at: string | null;
  created_at: string;
  order: {
    order_number: string;
    product: {
      name: string;
      image_urls?: string[];
    };
    buyer?: {
      full_name: string;
      email: string;
    };
  };
}

interface EscrowCardProps {
  escrowTransactions: EscrowTransaction[];
}

export function EscrowCard({ escrowTransactions }: EscrowCardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for countdown
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const holdingTransactions = escrowTransactions.filter(t => t.status === 'holding');

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`;

  const getTimeRemaining = (holdUntil: string) => {
    const now = currentTime.getTime();
    const target = new Date(holdUntil).getTime();
    const diff = target - now;

    if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { expired: false, days, hours, minutes, seconds };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (holdingTransactions.length === 0) {
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
    <div className="space-y-4">
      {/* Individual Escrow Transactions */}
      {holdingTransactions.map((transaction) => {
        const timeRemaining = getTimeRemaining(transaction.hold_until);
        const isExpiringSoon = !timeRemaining.expired && timeRemaining.days === 0 && timeRemaining.hours < 24;

        return (
          <Card key={transaction.id} className={`border-2 ${isExpiringSoon ? 'border-green-300 bg-green-50' : 'border-orange-200 bg-white'} shadow-md`}>
            <CardContent className="p-6">
              {/* Product & Order Info */}
              <div className="flex items-start gap-4 mb-4">
                {/* Product Image */}
                {transaction.order.product.image_urls?.[0] && (
                  <div className="h-20 w-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <img 
                      src={transaction.order.product.image_urls[0]} 
                      alt={transaction.order.product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                {/* Product Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">{transaction.order.product.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">Order #{transaction.order.order_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(Number(transaction.amount))}</p>
                      <Badge variant="secondary" className="mt-1">
                        Holding
                      </Badge>
                    </div>
                  </div>

                  {/* Buyer Info */}
                  {transaction.order.buyer && (
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{transaction.order.buyer.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{transaction.order.buyer.email}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Countdown Timer */}
              <div className={`p-4 rounded-lg ${isExpiringSoon ? 'bg-green-100 border-2 border-green-300' : 'bg-orange-50 border border-orange-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Auto-release in:</span>
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                
                {timeRemaining.expired ? (
                  <div className="text-center py-3">
                    <p className="text-lg font-semibold text-green-600">✓ Ready for release!</p>
                    <p className="text-xs text-gray-600 mt-1">Funds will be released to your wallet shortly</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                        <div className={`text-3xl font-bold ${isExpiringSoon ? 'text-green-700' : 'text-orange-600'}`}>
                          {timeRemaining.days}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Days</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                        <div className={`text-3xl font-bold ${isExpiringSoon ? 'text-green-700' : 'text-orange-600'}`}>
                          {timeRemaining.hours}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Hours</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                        <div className={`text-3xl font-bold ${isExpiringSoon ? 'text-green-700' : 'text-orange-600'}`}>
                          {timeRemaining.minutes}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Mins</div>
                      </div>
                      <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                        <div className={`text-3xl font-bold ${isExpiringSoon ? 'text-green-700' : 'text-orange-600'}`}>
                          {timeRemaining.seconds}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Secs</div>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-xs text-gray-600">
                        Release date: <span className="font-medium">{formatDate(transaction.hold_until)}</span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}